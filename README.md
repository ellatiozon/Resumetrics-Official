# Resumetrics
**AI-Powered Resume Screening & Applicant Tracking System**

Resumetrics is a full-stack, AI application designed to eliminate human bias and accelerate the hiring process. It utilizes a multi-layered Natural Language Processing (NLP) pipeline to dynamically analyze, score, and summarize applicant resumes against specific job requirements.

---

##Core Features

* **Deterministic AI Pipeline:** Moves beyond simple keyword matching by utilizing Heuristics, Named Entity Recognition (NER), and Dense Vector Embeddings to evaluate candidate suitability.
* **Semantic Skill Alignment:** Employs Hugging Face `sentence-transformers` and `rapidfuzz` to map applicant skills to job requirements, calculating a precise similarity score.
* **Chronological Experience Math:** Automatically extracts employment dates and calculates total years of valid experience using Regex and morphology rules.
* **NLG Executive Synthesis:** Generates human-readable, hallucination-free executive summaries of a candidate's profile.
* **Role-Based Access Control (RBAC):** Features distinct, fully authenticated dashboards for HR Managers (Job Creation & Review) and Applicants (Job Discovery & Resume Upload).

---

##Tech Stack

### Frontend
* **React (Vite):** Fast, component-driven UI.
* **React Router:** For seamless single-page application navigation.
* **CSS/Bootstrap:** For clean, responsive dashboards and deterministic color-coded UI tiers.

### Backend & AI
* **FastAPI:** High-performance async Python backend.
* **MongoDB Atlas:** NoSQL database for flexible document storage and lazy-creation schemas.
* **spaCy:** For advanced Natural Language Processing and tokenization (`en_core_web_sm`).
* **Sentence-Transformers:** Deep-learning semantic vector embeddings.
* **pdfplumber & docx:** For robust text extraction from unstructured document uploads.
* **JWT & Passlib:** Secure password hashing and token-based authentication.

---

##Architecture & Data Flow

1. **Applicant Upload:** User submits a PDF/Word resume via the React frontend.
2. **Text Extraction:** FastAPI parses the raw bytes into structured text strings.
3. **Chunking & Tagging:** Text is processed via regex and spaCy to identify roles, dates, and skills.
4. **Semantic Math:** The system calculates the `fraction_score` (skills met vs. required) and absolute tenure (years worked).
5. **Rule-Based Tiering:** The applicant is assigned a deterministic tier (e.g., `HIGH ALIGNMENT`, `EXPERIENCED, BUT SKILL GAP`).
6. **HR Dashboard:** MongoDB serves the compiled metrics back to the HR UI for a final manual review and decision.

---

##Local Development Setup

To run this project locally, it will need two terminal windows open.

### 1. Backend Setup
Navigate to the backend directory:
```bash
cd backend
