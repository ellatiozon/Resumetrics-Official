from pymongo import MongoClient
import certifi
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# --- MongoDB Setup ---
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://dbUser:dbUserPassword@cluster0.uttwspo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
)

# Create MongoDB client with TLS support
mongo_client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())

# ==========================================
# 🚀 THE CHANGE: Point to a brand new database
# ==========================================
mongo_db = mongo_client["resumetrics_v2"]

# Collections (These will be auto-created upon first insert)
resumes_collection = mongo_db["resumes"]        
jobs_collection = mongo_db["job_posts"]         
users_collection = mongo_db["users"]            
hr_collection = mongo_db["hr_users"]