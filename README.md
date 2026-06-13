# Resumetrics
**AI-Driven Resume Screening & Applicant Tracking System**

Resumetrics is a full-stack web application designed to optimize the technical recruitment pipeline using advanced Natural Language Processing (NLP). Moving beyond rigid keyword matching, the platform utilizes semantic vector embeddings, structural text parsing, and rule-based decision logic to score, categorize, and summarize incoming applicant resumes against specific job mandates.

---

## Key Features

* **Multi-Layered NLP Pipeline:** Extracts raw text from unstructured documents (PDF/Docx) and runs context-aware processing.
* **Semantic Skill Alignment:** Computes cosine similarity scores using Hugging Face deep learning models to identify core competency matches and pinpoint missing requirements.
* **Deterministic Experience Mathematics:** Evaluates career tenure dynamically by parsing chronological employment blocks and calculating absolute experience years.
* **Automated Executive Synthesis:** Generates human-readable, hallucination-free summaries outlining why a candidate aligns or displays a skill gap.
* **Role-Based Workflows:** Distinct, secure execution routing for HR Managers (Job Request Creation & Pending AI Reviews) and Applicants.

---

## Tech Stack

### Frontend
* **React.js (Vite)** – Component-driven Single Page Application (SPA) architecture.
* **React Router DOM** – Declarative client-side routing and state preservation.
* **Bootstrap Icons** – For UI visual indicators and metric tiers.

### Backend & AI Engine
* **FastAPI** – High-performance, asynchronous Python web framework.
* **spaCy (`en_core_web_sm`)** – For linguistic tokenization and structural phrase chunking.
* **Sentence-Transformers** – Deep learning semantic vector embeddings.
* **PyMongo** – Native MongoDB driver for async document transactions.

### Database
* **MongoDB Atlas** – Cloud-hosted NoSQL document database utilizing flexible schemas and lazy-creation mechanics.

---

## Repository Structure

```text
Resumetrics/
├── backend/
│   ├── main.py                 # FastAPI Application entry point
│   ├── database.py             # MongoDB connection instantiation
│   ├── requirements.txt        # Python dependency manifest
│   └── utils/
│       └── ai_extractor.py     # NLP pipeline & extraction utilities
└── frontend/
    ├── src/
    │   ├── components/         # Reusable UI components
    │   │   └── HRDashboard/    # HR View components (ReviewApplicants, etc.)
    │   ├── App.jsx             # React routing configurations
    │   └── main.jsx            # React app mount target
    ├── package.json            # Node dependency manifest
    └── vite.config.js          # Vite build configurations
```

---

## Local Setup & Deployment

Follow these step-by-step instructions to clone, configure, and boot both environment instances on your local machine.

### 📋 Prerequisites
* **Python 3.10+** installed.
* **Node.js (v18+)** and `npm` installed.
* An active **MongoDB Atlas** cluster instance.

---

### 1. Backend Configuration & Startup

Open a terminal window and navigate to the backend directory:
```bash
cd backend
```

Create an isolated virtual environment to manage dependencies safely:
```bash
python -m venv .venv
```

Activate the virtual environment:
* **Mac/Linux:** `source .venv/bin/activate`
* **Windows (CMD):** `.venv\Scripts\activate.bat`
* **Windows (PowerShell):** `.venv\Scripts\Activate.ps1`

Install the required core packages and dependencies:
```bash
pip install -r requirements.txt
```

Download and link the native spaCy language model statistical package:
```bash
python -m spacy download en_core_web_sm
```

Create a `.env` file inside the root of your `backend/` folder to store runtime environments securely:
```env
MONGO_URI=your_mongodb_connection_string_here
PORT=8000
```

Boot the local async Uvicorn development server:
```bash
uvicorn main:app --reload
```
*The backend API documentation will now be interactive at `http://127.0.0.1:8000/docs`.*

---

### 2. Frontend Configuration & Startup

Open a secondary terminal window and navigate to the frontend directory:
```bash
cd frontend
```

Install all required Node modules, dev-tools, and UI dependencies:
```bash
npm install
```

Launch the Vite local development ecosystem:
```bash
npm run dev
```

*Open your browser and navigate to the local address provided in your terminal (typically `http://localhost:5173`) to interact with the dashboards.*

---
*Architected and developed by Mikhaella Mari Dichoso Tiozon as a hands-on Computer Science project showcasing full-stack data flow and applied machine learning integration.*
