import os
import requests
from datetime import datetime
from sqlalchemy import event
from sqlmodel import Session
from app.config import settings
from app.models import User, Patient, Screening, Result, Report

# Extract Database URL
FIREBASE_DATABASE_URL = os.getenv(
    "FIREBASE_DATABASE_URL", 
    "https://eyeq-cbeda-default-rtdb.firebaseio.com"
).rstrip("/")

# Global flag to disable sync events during initial sync pull to prevent circular loops
SYNC_ENABLED = not settings.BYPASS_FIREBASE_AUTH

# Try to initialize or access Firebase Admin SDK
firebase_initialized = False
try:
    import firebase_admin
    from firebase_admin import db
    
    # Initialize if not already initialized
    if not firebase_admin._apps:
        # Check if databaseURL is configured
        firebase_admin.initialize_app(options={
            'databaseURL': f"{FIREBASE_DATABASE_URL}/"
        })
    firebase_initialized = True
    print("Firebase Admin SDK initialized successfully for Realtime Database.")
except Exception as e:
    print(f"Firebase Admin SDK RTDB integration bypassed: {e}. Falling back to REST API for sync.")


def sync_to_firebase(path: str, data: dict):
    """
    Syncs a dictionary to the Firebase Realtime Database path.
    Uses the Admin SDK if available, otherwise falls back to the REST API.
    """
    if not SYNC_ENABLED:
        return

    # Use Firebase Admin SDK if initialized
    if firebase_initialized:
        try:
            ref = db.reference(path)
            ref.set(data)
            print(f"[Firebase Sync] Successfully synced {path} via Admin SDK.")
            return
        except Exception as e:
            print(f"[Firebase Sync] Admin SDK failed: {e}. Trying REST API...")

    # REST API Fallback
    url = f"{FIREBASE_DATABASE_URL}{path}.json"
    try:
        response = requests.put(url, json=data, timeout=5)
        if response.status_code == 200:
            print(f"[Firebase Sync] Successfully synced {path} via REST API.")
        else:
            print(f"[Firebase Sync] Failed to sync {path} via REST: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[Firebase Sync] Network error syncing {path} to Firebase: {e}")


def delete_from_firebase(path: str):
    """
    Deletes a node from the Firebase Realtime Database path.
    Uses the Admin SDK if available, otherwise falls back to the REST API.
    """
    if not SYNC_ENABLED:
        return

    # Use Firebase Admin SDK if initialized
    if firebase_initialized:
        try:
            ref = db.reference(path)
            ref.delete()
            print(f"[Firebase Sync] Successfully deleted {path} via Admin SDK.")
            return
        except Exception as e:
            print(f"[Firebase Sync] Admin SDK delete failed: {e}. Trying REST API...")

    # REST API Fallback
    url = f"{FIREBASE_DATABASE_URL}{path}.json"
    try:
        response = requests.delete(url, timeout=5)
        if response.status_code == 200:
            print(f"[Firebase Sync] Successfully deleted {path} via REST API.")
        else:
            print(f"[Firebase Sync] Failed to delete {path} via REST: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[Firebase Sync] Network error deleting {path} from Firebase: {e}")


def serialize_model(model) -> dict:
    """
    Serializes a SQLModel/SQLAlchemy instance into a dictionary suitable for Firebase JSON.
    Converts datetime objects into ISO format strings.
    """
    if hasattr(model, "model_dump"):
        data = model.model_dump()
    else:
        data = model.dict()

    # Convert datetime values to ISO format strings
    for k, v in data.items():
        if isinstance(v, datetime):
            data[k] = v.isoformat()
    return data


# --- EVENT LISTENERS FOR WRITE-THROUGH SYNC ---

def after_save_listener(mapper, connection, target):
    """
    Handles after_insert and after_update events.
    """
    table_name = target.__tablename__
    target_id = getattr(target, 'id', None)
    if target_id:
        data = serialize_model(target)
        sync_to_firebase(f"/{table_name}/{target_id}", data)

def after_delete_listener(mapper, connection, target):
    """
    Handles after_delete events.
    """
    table_name = target.__tablename__
    target_id = getattr(target, 'id', None)
    if target_id:
        delete_from_firebase(f"/{table_name}/{target_id}")

# Register listeners to all models
for model in [User, Patient, Screening, Result, Report]:
    event.listen(model, 'after_insert', after_save_listener)
    event.listen(model, 'after_update', after_save_listener)
    event.listen(model, 'after_delete', after_delete_listener)


# --- STARTUP PULL SYNC LAYER ---

def pull_all_from_firebase(session: Session):
    """
    Pulls the entire database structure from Firebase RTDB on startup and
    syncs/populates the local SQLite database.
    """
    global SYNC_ENABLED
    original_sync_enabled = SYNC_ENABLED
    # Disable event handlers to prevent feedback loop
    SYNC_ENABLED = False
    
    url = f"{FIREBASE_DATABASE_URL}/.json"
    try:
        print(f"Fetching cloud data from Firebase Realtime Database at {url}...")
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"Skipped database pull: Firebase RTDB returned status code {response.status_code}")
            return
        
        db_data = response.json()
        if not db_data or not isinstance(db_data, dict):
            print("No data found in Firebase RTDB or database is empty.")
            return
        
        print("Pulling and syncing data from Firebase Realtime Database...")
        
        # 1. Sync Users
        users_data = db_data.get("users", {})
        for uid, u_dict in users_data.items():
            if not u_dict: continue
            db_user = session.get(User, uid)
            if db_user:
                for k, v in u_dict.items():
                    setattr(db_user, k, v)
            else:
                session.add(User(**u_dict))
        session.commit()
        
        # 2. Sync Patients
        patients_data = db_data.get("patients", {})
        for pid, p_dict in patients_data.items():
            if not p_dict: continue
            if "created_at" in p_dict and isinstance(p_dict["created_at"], str):
                p_dict["created_at"] = datetime.fromisoformat(p_dict["created_at"])
            db_patient = session.get(Patient, pid)
            if db_patient:
                for k, v in p_dict.items():
                    setattr(db_patient, k, v)
            else:
                session.add(Patient(**p_dict))
        session.commit()
        
        # 3. Sync Screenings
        screenings_data = db_data.get("screenings", {})
        for sid, s_dict in screenings_data.items():
            if not s_dict: continue
            if "created_at" in s_dict and isinstance(s_dict["created_at"], str):
                s_dict["created_at"] = datetime.fromisoformat(s_dict["created_at"])
            db_screening = session.get(Screening, sid)
            if db_screening:
                for k, v in s_dict.items():
                    setattr(db_screening, k, v)
            else:
                session.add(Screening(**s_dict))
        session.commit()
        
        # 4. Sync Results
        results_data = db_data.get("results", {})
        for rid, r_dict in results_data.items():
            if not r_dict: continue
            db_result = session.get(Result, rid)
            if db_result:
                for k, v in r_dict.items():
                    setattr(db_result, k, v)
            else:
                session.add(Result(**r_dict))
        session.commit()
        
        # 5. Sync Reports
        reports_data = db_data.get("reports", {})
        for rep_id, rep_dict in reports_data.items():
            if not rep_dict: continue
            if "created_at" in rep_dict and isinstance(rep_dict["created_at"], str):
                rep_dict["created_at"] = datetime.fromisoformat(rep_dict["created_at"])
            db_report = session.get(Report, rep_id)
            if db_report:
                for k, v in rep_dict.items():
                    setattr(db_report, k, v)
            else:
                session.add(Report(**rep_dict))
        session.commit()
        
        print("Startup data synchronization from Firebase RTDB completed successfully.")
        
    except Exception as e:
        print(f"Error during startup data pull from Firebase RTDB: {e}")
    finally:
        SYNC_ENABLED = original_sync_enabled
