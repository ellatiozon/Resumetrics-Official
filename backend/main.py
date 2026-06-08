from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr
from typing import List
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
import pytesseract
from PIL import Image
import io
import os
import platform
import pandas as pd

from database import resumes_collection, jobs_collection, hr_collection, users_collection
from utils.ai_extractor import process_resume_extraction
from utils.skills import evaluate_semantic_alignment, evaluate_final_decision, generate_executive_summary

# ===============================================================
# 🧠 App Initialization
# ===============================================================
app = FastAPI(title="Resume Parser API + MongoDB Auth")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # ⚠️ restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================================================
# ⚙️ Password hashing
# ===============================================================
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

# ===============================================================
# ⚙️ JWT Configuration
# ===============================================================
SECRET_KEY = "your_super_secret_key"  # Change in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def create_access_token(data: dict, expires_delta: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token


def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        role = payload.get("role")
        if email is None or role is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"email": email, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    token = authorization.split(" ")[1]
    return verify_token(token)

# ===============================================================
# ⚙️ Configure Tesseract for Windows
# ===============================================================
if platform.system() == "Windows":
    possible_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
    ]
    for path in possible_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            break

# ===============================================================
# 🔐 Models
# ===============================================================
class SignUpModel(BaseModel):
    firstName: str 
    lastName: str 
    email: EmailStr
    gender: str | None = None
    birthdate: str | None = None
    phone: str | None = None
    password: str
    confirmPassword: str

class HRSignUpModel(BaseModel):
    companyName: str
    email: EmailStr
    contactNumber: str
    address: str
    password: str
    confirmPassword: str
    logoFileName: str | None = None

class LoginModel(BaseModel):
    email: str
    password: str


class JobModel(BaseModel):
    title: str
    category: str
    type: str
    deadline: str
    openings: int
    min_rate: str
    max_rate: str
    rate_type: str
    description: str
    skills: List[str]
    min_experience: int
    company_name: str | None = None

# -------------------------
# HR Signup Endpoint
# -------------------------
@app.post("/hr/signup")
async def hr_signup(user: HRSignUpModel):
    # Check if email already exists
    if hr_collection.find_one({"email": user.email}):
        return {"success": False, "message": "Email already registered"}

    # Validate password match
    if user.password != user.confirmPassword:
        return {"success": False, "message": "Passwords do not match"}

    # Hash password
    hashed_password = pwd_context.hash(user.password)

    # Prepare HR record
    hr_record = {
        "company_name": user.companyName,
        "email": user.email.lower(),
        "contact_number": user.contactNumber,
        "address": user.address,
        "logo_file_name": user.logoFileName,
        "password": hashed_password,
        "created_at": datetime.utcnow(),
        "role": "hr"
    }

    # Insert into database
    hr_collection.insert_one(hr_record)

    return {"success": True, "message": "HR account registered successfully"}


@app.post("/hr/login")
async def hr_login(user: LoginModel):
    db_user = hr_collection.find_one({"email": user.email})
    if not db_user:
        return {"success": False, "message": "HR user not found"}

    if not pwd_context.verify(user.password, db_user["password"]):
        return {"success": False, "message": "Incorrect password"}

    token = create_access_token({"sub": db_user["email"], "role": "hr"})
    return {
        "success": True,
        "message": "HR login successful",
        "token": token,
        "user": {"email": db_user["email"], "role": "hr"}
    }

# ===============================================================
# 🔐 Applicant Authentication Endpoints
# ===============================================================
@app.post("/signup")
def signup(user: SignUpModel):
    # 1️⃣ Check passwords match
    if user.password != user.confirmPassword:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # 2️⃣ Check if email exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered.")

    # 3️⃣ Hash password
    hashed_pw = pwd_context.hash(user.password)

    # 4️⃣ Prepare user data
    new_user = {
        "first_name": user.firstName,
        "last_name": user.lastName,
        "email": user.email.lower(),
        "gender": user.gender,
        "birthdate": user.birthdate,
        "phone": user.phone,
        "password": hashed_pw,
        "created_at": datetime.utcnow(),
        "role": "applicant",  # default role
    }

    # 5️⃣ Save to database
    users_collection.insert_one(new_user)

    return {"success": True, "message": "Account created successfully!"}


@app.post("/login")
async def login(user: LoginModel):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        return {"success": False, "message": "User not found"}

    if not pwd_context.verify(user.password, db_user["password"]):
        return {"success": False, "message": "Incorrect password"}

    token = create_access_token({"sub": db_user["email"], "role": "ap"})
    return {
        "success": True,
        "message": "Login successful",
        "token": token, # <--- This token must be saved
        "user": {"email": db_user["email"], "role": "ap"}
    }

# ===============================================================
# 📄 Resume Parsing (Protected)
# ===============================================================
@app.post("/analyze")
async def analyze_resume(
    resume: UploadFile = File(...),
    job_id: str = Query(..., description="ID of the job the applicant is applying for"),
    current_user: dict = Depends(get_current_user)
):
    filename = resume.filename.lower()
    
    # 1. Fetch Job Requirements from MongoDB
    job = jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    target_skills = job.get("skills", [])
    job_min_exp = job.get("min_experience", 0)

    # 2. Phase 1 & 2: Data Extraction & Structure (ai_extractor.py)
    # Note: Our new pipeline specifically targets document structures (PDF/DOCX)
    if not filename.endswith((".pdf", ".docx", ".doc")):
        return JSONResponse({"error": "Only PDF and DOCX formats supported by the NLP pipeline"}, status_code=400)
        
    file_bytes = await resume.read()
    try:
        extracted_data = process_resume_extraction(file_bytes, filename)
    except Exception as e:
        return JSONResponse({"error": f"Document extraction failed: {str(e)}"}, status_code=500)
        
    resume_text = extracted_data["full_normalized_text"]
    applicant_years = extracted_data["total_years_experience"]
    structured_roles = extracted_data["structured_roles"]

    # 3. Phase 3: Semantic Vector Alignment (skills.py)
    matched_skills, semantic_logs = evaluate_semantic_alignment(resume_text, target_skills)
    missing_skills = list(set(target_skills) - set(matched_skills))

    # 4. Phase 4: Deterministic Decision Engine
    decision = evaluate_final_decision(matched_skills, target_skills, applicant_years, job_min_exp)

    # 5. Phase 5: NLG Executive Summary
    # Attempt to dynamically pull their primary job title for the summary
    primary_role = "Professional"
    if structured_roles and len(structured_roles) > 0:
        for chunk_data in structured_roles[0]:
            if chunk_data["state"] == "JOB_TITLE":
                primary_role = chunk_data["chunk"]
                break

    hr_summary = generate_executive_summary(
        tier=decision["tier"],
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        years_exp=applicant_years,
        primary_role=primary_role
    )

    # 6. Construct the Ultimate HR Database Payload
    parsed_data = {
        "filename": resume.filename,
        "structured_roles": structured_roles,
        "education": extracted_data["education"],     # <-- ADD THIS
        "experience": extracted_data["experience"],   # <-- ADD THIS
        "total_experience_years": applicant_years,
        "min_experience_required": job_min_exp,
        "experience_met": decision["exp_flag"],
        "skills_matched": matched_skills,
        "missing_skills": missing_skills,
        "semantic_logs": semantic_logs,          
        "tier": decision["tier"],
        "action_required": decision["action"],
        "fraction_score": decision["fraction"],
        "executive_summary": hr_summary,         
        "submitted_by": current_user["email"],
        "job_id": job_id,
        "application_status": "Pending",
        "created_at": datetime.utcnow().isoformat()
    }

    result = resumes_collection.insert_one(parsed_data)
    parsed_data["_id"] = str(result.inserted_id)
    
    return JSONResponse(content=parsed_data)

# ===============================================================
# 💼 Job Posting + Listing (HR Only)
# ===============================================================



def require_hr(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="HR access only")
    return current_user


@app.post("/jobs")
async def create_job(job: JobModel, current_user: dict = Depends(require_hr)):
    # Fetch HR info from database
    hr_user = hr_collection.find_one({"email": current_user["email"]})
    if not hr_user:
        raise HTTPException(status_code=404, detail="HR user not found")

    job_dict = job.model_dump()
    job_dict["created_by"] = current_user["email"]
    job_dict["company_name"] = hr_user.get("company_name", "Unknown Company")  # Automatically set company name

    result = jobs_collection.insert_one(job_dict)
    job_dict["_id"] = str(result.inserted_id)
    return job_dict



@app.get("/jobs")
async def get_all_jobs(current_user: dict = Depends(get_current_user)):
    jobs = list(jobs_collection.find({}))
    for job in jobs:
        # Convert ObjectId to string
        job["_id"] = str(job["_id"])

        # Lookup HR info based on the email who created the job
        hr_user = hr_collection.find_one({"email": job.get("created_by")})
        job["company_name"] = hr_user.get("company_name") if hr_user else "Unknown Company"
        job["address"] = hr_user.get("address") if hr_user else "Address Not Available"

    return jobs


@app.get("/jobs/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job["_id"] = str(job["_id"])
    return job

@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str, current_user: dict = Depends(require_hr)):
    job = jobs_collection.find_one({"_id": ObjectId(job_id)})

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["created_by"] != current_user["email"]:
        raise HTTPException(status_code=403, detail="You can only delete your own jobs")

    jobs_collection.delete_one({"_id": ObjectId(job_id)})
    return {"message": "Job deleted successfully"}

# ===============================================================
# 🚀 Root
# ===============================================================
@app.get("/")
def root():
    return {"message": "Welcome to the Resumetrics API 👋 (Windows OCR Ready + MongoDB Auth)"}

# ===============================================================
# 🧾 Skills Endpoint
# ===============================================================
skills_df = pd.read_excel("skills_dataset.xlsx")
skills_list = skills_df["Skills"].dropna().tolist()
SKILLS_DB = skills_list


@app.get("/skills")
def get_skills(q: str = Query("", description="Search term for skills")):
    query = q.lower()
    if not query:
        return JSONResponse(content=skills_list[:10])
    filtered = [s for s in skills_list if query in s.lower()]
    return JSONResponse(content=filtered[:10])

# ===============================================================
# 📝 Application Management Endpoints (HR Only)
# ===============================================================
@app.get("/applications")
async def get_applications(current_user: dict = Depends(require_hr)):
    hr_email = current_user["email"]

    # Get jobs posted by the HR
    jobs_posted = jobs_collection.find({"created_by": hr_email}, {"_id": 1, "title": 1})
    job_map = {str(job["_id"]): job["title"] for job in jobs_posted}
    job_ids = list(job_map.keys())

    if not job_ids:
        return []

    # Fetch pending applications for these jobs
    applications = list(resumes_collection.find({
        "job_id": {"$in": job_ids},
        "application_status": {"$in": ["Pending", None]},
        "submitted_by": {"$ne": hr_email}
    }))

    formatted_applications = []
    for app in applications:
        application_job_id = app.get("job_id")
        job_title = job_map.get(application_job_id, "Job Title Not Found")

        formatted_applications.append({
            "_id": str(app["_id"]),
            "applicant_email": app.get("submitted_by"),
            "application_status": app.get("application_status", "Pending"),
            "filename": app.get("filename"),
            "title": job_title,
            "job_id": str(application_job_id) if application_job_id else None,
            "education": app.get("education", []),
            "experience": app.get("experience", []),
            "total_experience_years": app.get("total_experience_years", 0),
            "skills_matched": app.get("skills_matched", []),
            "experience_met": app.get("experience_met", False),
            "min_experience_required": app.get("min_experience_required", 0),
            
            # --- THE NEW AI METRICS ---
            "missing_skills": app.get("missing_skills", []),
            "tier": app.get("tier", "UNCLASSIFIED"),
            "fraction_score": app.get("fraction_score", "N/A"),
            "executive_summary": app.get("executive_summary", "No summary available."),
            "action_required": app.get("action_required", "Manual Review"),
            
            "reviewed_by": app.get("reviewed_by", None),
            "reviewed_at": app.get("reviewed_at", None),
        })

    return formatted_applications


@app.post("/applications/{app_id}/{status}")
async def update_application_status(
    app_id: str,
    status: str,
    current_user: dict = Depends(require_hr)
):
    if status.lower() not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Status must be 'approve' or 'reject'")

    new_status = "Approved" if status.lower() == "approve" else "Rejected"

    result = resumes_collection.update_one(
        {"_id": ObjectId(app_id)},
        {"$set": {
            "application_status": new_status,
            "reviewed_by": current_user["email"],
            "reviewed_at": datetime.utcnow()
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")

    return {"message": f"Application {app_id} status updated to {new_status}"}

@app.get("/applications/approved")
async def get_approved_applications(current_user: dict = Depends(require_hr)):
    hr_email = current_user["email"]

    # 1. Get IDs of jobs posted by the current HR user
    jobs_posted = jobs_collection.find({"created_by": hr_email}, {"_id": 1, "title": 1})
    job_map = {str(job["_id"]): job["title"] for job in jobs_posted}
    job_ids = list(job_map.keys())

    if not job_ids:
        return []

    # 2. Find applications that are 'Approved' AND belong to the HR's jobs
    applications = list(resumes_collection.find({
        "job_id": {"$in": job_ids},
        "application_status": "Approved",
        "submitted_by": {"$ne": hr_email}
    }))

    # 3. Format the data for the frontend
    formatted_applications = []
    for app in applications:
        application_job_id = app.get("job_id")
        job_title = job_map.get(application_job_id, "Job Title Not Found")
        formatted_applications.append({
            "_id": str(app["_id"]),
            "applicant_email": app.get("submitted_by"),
            "filename": app.get("filename"),
            "title": job_title,
            "job_id": application_job_id,
            "reviewed_at": app.get("reviewed_at", "N/A"),
            "reviewed_by": app.get("reviewed_by", "N/A"),
            "education": app.get("education", []),
            "experience": app.get("experience", []),
            "total_experience_years": app.get("total_experience_years", 0),
            "skills_matched": app.get("skills_matched", []),
            
            # --- THE NEW AI METRICS ---
            "missing_skills": app.get("missing_skills", []),
            "tier": app.get("tier", "UNCLASSIFIED"),
            "fraction_score": app.get("fraction_score", "N/A"),
            "executive_summary": app.get("executive_summary", "No summary available."),
            "action_required": app.get("action_required", "Manual Review"),
        })

    return formatted_applications

@app.get("/applications/me")
async def get_my_applications(current_user: dict = Depends(get_current_user)):
    applicant_email = current_user["email"]

    applications = list(resumes_collection.find({"submitted_by": applicant_email}))
    job_ids = [app["job_id"] for app in applications if "job_id" in app]
    job_object_ids = [ObjectId(jid) for jid in job_ids]
    jobs_applied_for = jobs_collection.find({"_id": {"$in": job_object_ids}})

    job_map = {str(job["_id"]): job for job in jobs_applied_for}

    my_applications_status = []
    for app in applications:
        job_id_str = app.get("job_id")
        job_details = job_map.get(job_id_str)

        # Lookup HR info to get company address
        if job_details:
            hr_user = hr_collection.find_one({"email": job_details.get("created_by")})
            company_name = job_details.get("company_name", hr_user.get("company_name") if hr_user else "N/A")
            company_address = hr_user.get("address") if hr_user else "N/A"
        else:
            company_name = "Job Deleted/Not Found"
            company_address = "N/A"

        my_applications_status.append({
            "application_id": str(app["_id"]),
            "job_id": job_id_str,
            "job_title": job_details.get("title") if job_details else "Job Deleted/Not Found",
            "company_name": company_name,
            "company_address": company_address,
            "application_status": app.get("application_status", "Pending"),
            "suitability_score": app.get("suitability_score", 0),
            "date_applied": str(app["_id"].generation_time)
        })

    return my_applications_status


# ===============================================================
# 👤 User Profile Endpoint
# ===============================================================
@app.get("/user/me")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Fetches the details of the currently authenticated user (Applicant or HR).
    The email is retrieved from the JWT token.
    """
    return {
        "email": current_user["email"],
        "role": current_user["role"]
    }

# ===============================================================
# 👤 Applicant Account Management
# ===============================================================

class AccountUpdateModel(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    email: EmailStr | None = None
    password: str | None = None


@app.get("/ap/account")
async def get_applicant_account(current_user: dict = Depends(get_current_user)):
    """Fetch the logged-in applicant's account info."""
    if current_user["role"] != "ap":
        raise HTTPException(status_code=403, detail="Access denied")

    user = users_collection.find_one({"email": current_user["email"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "firstName": user.get("first_name", ""),
        "lastName": user.get("last_name", ""),
        "email": user.get("email", "")
    }


@app.put("/ap/account")
async def update_applicant_account(
    update: AccountUpdateModel,
    current_user: dict = Depends(get_current_user)
):
    """Update applicant account info."""
    if current_user["role"] != "ap":
        raise HTTPException(status_code=403, detail="Access denied")

    user = users_collection.find_one({"email": current_user["email"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_fields = {}
    if update.firstName:
        update_fields["first_name"] = update.firstName
    if update.lastName:
        update_fields["last_name"] = update.lastName
    if update.email:
        # Check if new email already exists
        if users_collection.find_one({"email": update.email, "_id": {"$ne": user["_id"]}}):
            raise HTTPException(status_code=400, detail="Email already in use")
        update_fields["email"] = update.email.lower()
    if update.password:
        update_fields["password"] = pwd_context.hash(update.password)

    if not update_fields:
        raise HTTPException(status_code=400, detail="No changes provided")

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": update_fields}
    )

    return {"message": "Account updated successfully"}

# -------------------------
# HR Account Update Model
# -------------------------
class HRAccountUpdateModel(BaseModel):
    companyName: str | None = None
    email: EmailStr | None = None
    contactNumber: str | None = None
    password: str | None = None


@app.get("/hr/account")
async def get_hr_account(current_user: dict = Depends(get_current_user)):
    """Fetch the logged-in HR's account info."""
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Access denied")

    hr_user = hr_collection.find_one({"email": current_user["email"]})
    if not hr_user:
        raise HTTPException(status_code=404, detail="HR user not found")

    return {
        "companyName": hr_user.get("company_name", ""),
        "email": hr_user.get("email", ""),
        "contactNumber": hr_user.get("contact_number", ""),
    }


@app.put("/hr/account")
async def update_hr_account(
    update: HRAccountUpdateModel,
    current_user: dict = Depends(get_current_user)
):
    """Update HR account info."""
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Access denied")

    hr_user = hr_collection.find_one({"email": current_user["email"]})
    if not hr_user:
        raise HTTPException(status_code=404, detail="HR user not found")

    update_fields = {}
    if update.companyName:
        update_fields["company_name"] = update.companyName
    if update.email:
        # Check if new email already exists
        if hr_collection.find_one({"email": update.email, "_id": {"$ne": hr_user["_id"]}}):
            raise HTTPException(status_code=400, detail="Email already in use")
        update_fields["email"] = update.email.lower()
    if update.contactNumber:
        update_fields["contact_number"] = update.contactNumber
    if update.password:
        update_fields["password"] = pwd_context.hash(update.password)

    if not update_fields:
        raise HTTPException(status_code=400, detail="No changes provided")

    hr_collection.update_one(
        {"_id": hr_user["_id"]},
        {"$set": update_fields}
    )

    return {"message": "HR account updated successfully"}

import os

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)


# All other existing FastAPI code follows...




