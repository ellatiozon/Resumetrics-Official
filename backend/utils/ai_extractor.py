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

def normalize_and_segment(text: str) -> tuple:
    """Cleans noise and uses strict boundary heuristics to chunk text."""
    clean_text = re.sub(r'\s+', ' ', text).strip()
    sections = {'education': [], 'experience': [], 'skills': []}
    current_section = None
    
    for line in text.split('\n'):
        line_clean = line.strip()
        line_upper = line_clean.upper()
        if not line_clean: continue
        
        # Header heuristic: Short lines with keywords
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
    """Splits messy resume lines by standard delimiters."""
    chunks = re.split(r'\s*[\|\—\–]\s*|\s+-\s+', line)
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
    # The crucial Phase 4 bug fix applied here:
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
    """
    The main entry point for the FastAPI router. 
    """
    raw_text = extract_raw_text(file_bytes, filename)
    sections, normalized_text = normalize_and_segment(raw_text)
    
    parsed_roles = []
    formatted_experience = [] # <-- NEW: This will hold the UI-friendly data
    
    for line in sections['experience']:
        if "|" in line:
            chunks = split_by_delimiters(line)
            role_states = simulate_hmm_chunk_tagging(chunks)
            parsed_roles.append(role_states)
            
            # THE TRANSLATOR: Convert HMM AI states back to UI expected keys
            exp_dict = {"role": "", "company": "", "duration": []}
            for item in role_states:
                if item["state"] == "JOB_TITLE":
                    exp_dict["role"] = item["chunk"]
                elif item["state"] == "ORGANIZATION":
                    exp_dict["company"] = item["chunk"]
                elif item["state"] == "DATE_RANGE":
                    exp_dict["duration"].append(item["chunk"])
            
            # Join dates (e.g., ["2024", "Present"] -> "2024 - Present")
            exp_dict["duration"] = " - ".join(exp_dict["duration"])
            formatted_experience.append(exp_dict)
            
    # Quick formatting for Education so it doesn't show as empty
    formatted_education = [{"school": line, "degree": "", "field": "", "duration": ""} for line in sections['education']]
            
    total_years = calculate_total_tenure(sections['experience'])
    
    return {
        "full_normalized_text": normalized_text,
        "total_years_experience": total_years,
        "structured_roles": parsed_roles,
        "experience": formatted_experience,  # <-- Pass to main.py
        "education": formatted_education     # <-- Pass to main.py
    }