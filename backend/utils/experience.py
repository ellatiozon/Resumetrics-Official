import re
from datetime import datetime

def calculate_experience_years(experiences: list) -> int:
    total_years = 0
    for exp in experiences:
        duration = exp.get("duration", "").lower()
        match = re.findall(r"(19|20)\d{2}|present", duration)
        if match:
            try:
                start_year = int(match[0]) if match[0] != "present" else datetime.now().year
                end_year = int(match[-1]) if match[-1] != "present" else datetime.now().year
                total_years += max(0, end_year - start_year)
            except:
                continue
    return total_years
