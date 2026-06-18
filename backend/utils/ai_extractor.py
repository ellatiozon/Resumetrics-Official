import re
import io
import spacy
import pdfplumber
import docx

# Initialize NLP model once when the server starts
nlp = spacy.load("en_core_web_sm")

def extract_raw_text(file_bytes: bytes, filename: str) -> str:
    """Pulls raw string data from the FastAPI byte stream."""
    text = ""
    if filename.endswith(".pdf"):
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])
    elif filename.endswith((".docx", ".doc")):
        doc = docx.Document(io.BytesIO(file_bytes))
        text = "\n".join([p.text for p in doc.paragraphs])
    return text

def heal_pdf_line_breaks(text: str) -> str:
    """
    NLP FIX 1: Resolves the 'Processing.' dangling bullet bug.
    PDF parsers often insert artificial newlines (\n) when text hits the edge of a page.
    This function looks for lines that DO NOT end in terminal punctuation (.!?) 
    and stitches them to the next line.
    """
    lines = text.split('\n')
    healed_lines = []
    buffer = ""
    
    for line in lines:
        stripped_line = line.strip()
        if not stripped_line:
            continue
            
        buffer += " " + stripped_line if buffer else stripped_line
        
        # If the line ends with a natural sentence terminator or is very short (like a header), flush the buffer
        if re.search(r'[.:!?]$', stripped_line) or len(stripped_line.split()) < 5:
            healed_lines.append(buffer.strip())
            buffer = ""
            
    # Flush anything remaining
    if buffer:
        healed_lines.append(buffer.strip())
        
    return "\n".join(healed_lines)

def normalize_and_segment(text: str) -> tuple:
    """Cleans noise and uses strict boundary heuristics to chunk text."""
    # Heal the text BEFORE we try to segment it
    healed_text = heal_pdf_line_breaks(text)
    clean_text = re.sub(r'\s+', ' ', healed_text).strip()
    
    sections = {'education': [], 'experience': [], 'skills': []}
    current_section = None
    
    for line in healed_text.split('\n'):
        line_clean = line.strip()
        line_upper = line_clean.upper()
        if not line_clean: continue
        
        word_count = len(line_clean.split())
        is_header = word_count <= 5
        
        if is_header and any(re.search(rf"\b{h}\b", line_upper) for h in ["EDUCATION", "ACADEMIC"]):
            current_section = 'education'
            continue
        elif is_header and any(re.search(rf"\b{h}\b", line_upper) for h in ["EXPERIENCE", "EMPLOYMENT", "WORK"]):
            current_section = 'experience'
            continue
        elif is_header and any(re.search(rf"\b{h}\b", line_upper) for h in ["SKILLS", "TECHNICAL", "TECHNOLOGIES"]):
            current_section = 'skills'
            continue
            
        if current_section:
            sections[current_section].append(line_clean)
            
    return sections, clean_text

def split_by_delimiters(line: str) -> list:
    """
    NLP FIX 2: Resolves the Dropped Job Block bug.
    Expanded the regex array to catch weird symbols like `//`, `::`, or `~`
    that applicants use to separate their job titles from companies.
    """
    # Added \/\/ (double slash) to the delimiter regex
    chunks = re.split(r'\s*[\|\—\–\~]\s*|\s+-\s+|\s*\/\/\s*', line)
    return [chunk.strip() for chunk in chunks if chunk.strip()]

def simulate_hmm_chunk_tagging(chunks: list) -> list:
    """HMM logic applied to clean, isolated chunks."""
    states = []
    title_keywords = ["developer", "engineer", "analyst", "intern", "assistant", "manager", "lead"]
    date_keywords = ["present", "current", "now"]
    
    for chunk in chunks:
        doc = nlp(chunk)
        has_num = any(t.pos_ == "NUM" for t in doc)
        has_propn = any(t.pos_ == "PROPN" for t in doc)
        
        has_title_word = any(word in chunk.lower() for word in title_keywords)
        has_date_word = any(word in chunk.lower() for word in date_keywords)

        inferred_state = "UNKNOWN"
        
        # Look for a 4 digit year OR the word "present"
        if (has_num and re.search(r"\b(19|20)\d{2}\b", chunk)) or has_date_word:
            inferred_state = "DATE_RANGE"
        elif has_title_word:
            inferred_state = "JOB_TITLE"
        elif has_propn or "Inc" in chunk or "LLC" in chunk:
            inferred_state = "ORGANIZATION"
            
        states.append({"chunk": chunk, "state": inferred_state})
        
    return states

def calculate_total_tenure(experience_lines: list) -> int:
    """Calculates total chronological experience with correct Non-Capturing Regex."""
    experience_text = " ".join(experience_lines)
    four_digit_years = [int(y) for y in re.findall(r"\b(?:19|20)\d{2}\b", experience_text)]
    
    if not four_digit_years:
        return 0
        
    start_year = min(four_digit_years)
    if re.search(r"(present|current)", experience_text.lower()):
        from datetime import datetime
        end_year = datetime.now().year
    else:
        end_year = max(four_digit_years)
        
    return max(0, end_year - start_year)

# ==========================================
# MASTER ROUTER FUNCTION
# ==========================================
def process_resume_extraction(file_bytes: bytes, filename: str) -> dict:
    raw_text = extract_raw_text(file_bytes, filename)
    sections, normalized_text = normalize_and_segment(raw_text)
    
    parsed_roles = []
    formatted_experience = []
    
    for line in sections['experience']:
        # Update: We need to check if ANY of our valid delimiters exist in the line before splitting
        if any(delimiter in line for delimiter in ["|", "-", "—", "–", "//", "~"]):
            chunks = split_by_delimiters(line)
            role_states = simulate_hmm_chunk_tagging(chunks)
            parsed_roles.append(role_states)
            
            exp_dict = {"role": "", "company": "", "duration": []}
            for item in role_states:
                if item["state"] == "JOB_TITLE":
                    exp_dict["role"] = item["chunk"]
                elif item["state"] == "ORGANIZATION":
                    exp_dict["company"] = item["chunk"]
                elif item["state"] == "DATE_RANGE":
                    exp_dict["duration"].append(item["chunk"])
            
            exp_dict["duration"] = " - ".join(exp_dict["duration"])
            
            # Only add to the UI array if it actually found a Job Title
            if exp_dict["role"]:
                formatted_experience.append(exp_dict)
            
    formatted_education = [{"school": line, "degree": "", "field": "", "duration": ""} for line in sections['education']]
            
    total_years = calculate_total_tenure(sections['experience'])
    
    return {
        "full_normalized_text": normalized_text,
        "total_years_experience": total_years,
        "structured_roles": parsed_roles,
        "experience": formatted_experience,
        "education": formatted_education
    }