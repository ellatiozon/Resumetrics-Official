from pymongo import MongoClient
import certifi
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://dbUser:dbUserPassword@cluster0.uttwspo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
)

mongo_client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())

mongo_db = mongo_client["resumetrics_v2"]

resumes_collection = mongo_db["resumes"]        
jobs_collection = mongo_db["job_posts"]         
users_collection = mongo_db["users"]            
hr_collection = mongo_db["hr_users"]