from sentence_transformers import SentenceTransformer, util
from rapidfuzz import fuzz

sentence_model = SentenceTransformer("all-MiniLM-L6-v2")

def disambiguate_word_sense(target_word: str, context_text: str) -> str:
    """WSD using contextual keyword overlap (Lesk's Heuristic)."""
    text_clean = context_text.lower()
    
    sense_a_tech = ["developer", "code", "software", "programming", "sql", "git", "data", "api", "backend", "system"]
    sense_b_bio = ["snake", "reptile", "zoo", "animal", "nature", "species", "wildlife"]
    
    tech_score = sum(1 for word in sense_a_tech if word in text_clean)
    bio_score = sum(1 for word in sense_b_bio if word in text_clean)
    
    if target_word.lower() in text_clean:
        if tech_score >= bio_score:
            return f"Programming Language (Tech Score: {tech_score} vs Bio Score: {bio_score})"
        else:
            return f"Biological Organism (Bio Score: {bio_score} vs Tech Score: {tech_score})"
    return "Target Word Not Found in Context"

def evaluate_semantic_alignment(resume_text: str, target_skills: list, threshold: float = 0.38) -> tuple:
    """Generates Word Embeddings and calculates Cosine Similarity Matrices."""
    diagnostic_logs = []
    matched_skills = []
    
    resume_tensor = sentence_model.encode([resume_text], convert_to_tensor=True)
    
    for skill in target_skills:
        skill_lower = skill.lower()
        resume_lower = resume_text.lower()
        
        # Fast-Pass: Exact/Fuzzy Literal Match (Lowered ratio to 80 to catch plurals/minor typos)
        if skill_lower in resume_lower or fuzz.partial_ratio(skill_lower, resume_lower) >= 80:
            matched_skills.append(skill)
            diagnostic_logs.append({
                "skill": skill,
                "method": "Exact/Fuzzy Literal Match",
                "score": 1.0000
            })
            continue
            
        # Semantic Fallback: Dense Vector Embedding
        skill_tensor = sentence_model.encode([skill], convert_to_tensor=True)
        cosine_score = util.cos_sim(resume_tensor, skill_tensor).item()
        
        diagnostic_logs.append({
            "skill": skill,
            "method": "Dense Vector Embedding",
            "score": round(cosine_score, 4)
        })
        
        # NLP FIX 3: Lowered threshold from 0.45 to 0.38 to allow related tech stacks (e.g. AWS -> Cloud) to pass.
        if cosine_score >= threshold:
            matched_skills.append(skill)
            
    return matched_skills, diagnostic_logs

def evaluate_final_decision(matched_skills: list, target_skills: list, calculated_years: int, required_years: int) -> dict:
    """Deterministic Tiering Engine based on Skills and Tenure."""
    total_reqs = len(target_skills)
    matched_count = len(matched_skills)
    skills_ratio = matched_count / total_reqs if total_reqs > 0 else 0
    
    meets_experience = calculated_years >= required_years
    meets_core_skills = skills_ratio >= 0.50
    
    if meets_experience and meets_core_skills:
        tier = "HIGH ALIGNMENT"
        action = "SHORTLIST & INTERVIEW"
    elif meets_experience and not meets_core_skills:
        tier = "EXPERIENCED, BUT SKILL GAP"
        action = "FURTHER HR REVIEW"
    elif not meets_experience and meets_core_skills:
        tier = "SKILLED, BUT UNDER-EXPERIENCED"
        action = "ROUTE TO JUNIOR POOL"
    else:
        tier = "LOW ALIGNMENT"
        action = "AUTOMATED REJECT"
        
    return {
        "fraction": f"{matched_count}/{total_reqs}",
        "tier": tier,
        "action": action,
        "exp_flag": meets_experience
    }

def generate_executive_summary(tier: str, matched_skills: list, missing_skills: list, years_exp: int, primary_role: str = "Software Professional") -> str:
    """NLG Engine: Generates a human-readable narrative from quantitative metrics."""
    summary = f"The candidate is a {primary_role} bringing approximately {years_exp} years of calculated experience to the table. "
    
    def format_list(items):
        if not items: return ""
        if len(items) == 1: return items[0]
        return ", ".join(items[:-1]) + " and " + items[-1]
        
    matched_str = format_list(matched_skills)
    missing_str = format_list(missing_skills)
    
    if tier == "HIGH ALIGNMENT":
        summary += f"They demonstrate strong alignment with the technical requirements, successfully matching core competencies in {matched_str}. "
        if missing_skills:
            summary += f"However, brief upskilling or technical screening is recommended regarding {missing_str} to fully satisfy the role's expanded scope."
        else:
            summary += "The candidate successfully meets all benchmarked skill requirements with no detected gaps."
            
    elif tier == "EXPERIENCED, BUT SKILL GAP":
        summary += f"While they possess the necessary chronological tenure, they only demonstrated matches in {matched_str}. "
        if missing_skills:
            summary += f"A significant technical gap exists; the candidate requires substantial upskilling in {missing_str} before proceeding."
        
    elif tier == "SKILLED, BUT UNDER-EXPERIENCED":
        summary += f"They demonstrate excellent technical alignment, successfully matching core competencies in {matched_str}. "
        summary += f"However, they fall short of the required chronological tenure, making them a better fit for a Junior or Associate pipeline."
        
    else:
        summary += f"The candidate lacks both the required tenure and the core technical foundations. "
        if matched_skills:
            summary += f"They displayed tangential knowledge in {matched_str}, but critically lack experience with {missing_str}."
        else:
            summary += f"They did not register any significant matches against the target requirements."
            
    return summary