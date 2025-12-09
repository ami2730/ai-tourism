
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    EXPRESS_ML_URL = os.getenv("EXPRESS_ML_URL", "http://localhost:3000")
    ML_SECRET = os.getenv("ML_SECRET", "")


config = Config()