from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.database import get_session
from app.models import User
from sqlmodel import Session, select

security = HTTPBearer()

# Dynamic initialization of firebase admin to prevent crash if JSON file is missing
firebase_initialized = False
try:
    import firebase_admin
    from firebase_admin import credentials, auth
    
    # Initialize Firebase if firebase_credentials.json is provided
    # or let it initialize with default credentials
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    firebase_initialized = True
except Exception as e:
    print(f"Firebase Admin SDK not initialized: {e}. Running in Mock Bypass mode.")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verifies the Firebase ID token passed in the Authorization header.
    If BYPASS_FIREBASE_AUTH is enabled, it permits mock tokens.
    """
    token = credentials.credentials
    
    if settings.BYPASS_FIREBASE_AUTH:
        # Dev bypass token check
        if token.startswith("mock_"):
            parts = token.split("_")
            uid = parts[1] if len(parts) > 1 else "demo_doctor_id"
            name = parts[2].replace("-", " ") if len(parts) > 2 else "Dr. Alex Carter"
            email = parts[3] if len(parts) > 3 else "alex.carter@eyeq.innovate"
            role = parts[4] if len(parts) > 4 else "doctor"
            return {"uid": uid, "name": name, "email": email, "role": role}
        
        # Or if it's any token and we bypass, just return a default doctor
        return {"uid": "demo_doctor_id", "name": "Dr. Alex Carter", "email": "alex.carter@eyeq.innovate", "role": "doctor"}

    if not firebase_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Admin SDK is not initialized and Auth Bypass is disabled."
        )

    try:
        decoded_token = auth.verify_id_token(token)
        return {
            "uid": decoded_token.get("uid"),
            "name": decoded_token.get("name", "Medical Professional"),
            "email": decoded_token.get("email"),
            "role": decoded_token.get("role", "doctor")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {e}"
        )

def get_current_user(token_data: dict = Depends(verify_token), session: Session = Depends(get_session)) -> User:
    """
    Dependency to get or create the authenticated user from the database.
    """
    uid = token_data.get("uid")
    user = session.get(User, uid)
    
    if not user:
        # Prevent UNIQUE constraint crash by checking if a user with this email already exists
        existing_user = session.exec(select(User).where(User.email == token_data.get("email"))).first()
        if existing_user:
            return existing_user

        # Auto-provision user on their first authenticated API request
        user = User(
            id=uid,
            name=token_data.get("name"),
            email=token_data.get("email"),
            role=token_data.get("role", "doctor")
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to enforce admin role restriction.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operations restricted to Administrators."
        )
    return current_user
