import os
from pydantic_settings import BaseSettings

# Absolute path to backend directory
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Settings(BaseSettings):
    PROJECT_NAME: str = "EyeQ Innovate API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Cloud SQL configurations
    CLOUDSQL_USER: str = os.getenv("CLOUDSQL_USER", "postgres")
    CLOUDSQL_PASSWORD: str = os.getenv("CLOUDSQL_PASSWORD", "password")
    CLOUDSQL_IP: str = os.getenv("CLOUDSQL_IP", "")
    CLOUDSQL_DB: str = os.getenv("CLOUDSQL_DB", "eyeq-cbeda-2-database")

    DATABASE_URL: str = ""

    def __init__(self, **values):
        super().__init__(**values)
        
        # Determine database url
        env_db_url = os.getenv("DATABASE_URL")
        if env_db_url:
            self.DATABASE_URL = env_db_url
        elif self.CLOUDSQL_IP:
            self.DATABASE_URL = f"postgresql://{self.CLOUDSQL_USER}:{self.CLOUDSQL_PASSWORD}@{self.CLOUDSQL_IP}:5432/{self.CLOUDSQL_DB}"
        else:
            self.DATABASE_URL = f"sqlite:///{os.path.join(BACKEND_DIR, 'eyeq.db')}"

    # Storage Settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(BACKEND_DIR, "static", "uploads"))
    REPORTS_DIR: str = os.getenv("REPORTS_DIR", os.path.join(BACKEND_DIR, "static", "reports"))

    # Optional cloud storage configurations (AWS S3)
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "")

    # Firebase Authentication Configurations
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    # Set to True to allow auth validation using mock token/bypass local clinical development
    BYPASS_FIREBASE_AUTH: bool = os.getenv("BYPASS_FIREBASE_AUTH", "True").lower() == "true"

    # LLM config
    LLAMA_API_KEY: str = os.getenv("LLAMA_API_KEY", "")
    LLAMA_API_URL: str = os.getenv("LLAMA_API_URL", "https://api.groq.com/openai/v1/chat/completions")

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure local storage directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
