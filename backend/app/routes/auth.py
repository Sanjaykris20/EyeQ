from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, UserCreate, UserUpdate
from app.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/sync", response_model=User)
def sync_user(user_in: UserCreate, session: Session = Depends(get_session)):
    """
    Syncs a user registered in Firebase into the local SQL database.
    Called right after Firebase login on the client side.
    """
    user = session.get(User, user_in.id)
    if not user:
        # Check if this is the very first user; if so, make them an admin
        existing_users = session.exec(select(User)).all()
        role = "admin" if len(existing_users) == 0 else user_in.role
        
        user = User(
            id=user_in.id,
            name=user_in.name,
            email=user_in.email,
            role=role
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    return user

@router.get("/me", response_model=User)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the current authenticated user profile.
    """
    return current_user

@router.get("/users", response_model=list[User])
def list_users(session: Session = Depends(get_session), current_user: User = Depends(get_current_admin)):
    """
    Lists all users registered in the system (Admin only).
    """
    users = session.exec(select(User)).all()
    return users

@router.put("/users/{user_id}", response_model=User)
def update_user_role(
    user_id: str,
    user_update: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin)
):
    """
    Updates user role (Admin only).
    """
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Do not allow admin to demote themselves if they are the only admin
    if db_user.id == current_user.id and user_update.role != "admin":
        other_admins = session.exec(select(User).where(User.role == "admin").where(User.id != user_id)).all()
        if not other_admins:
            raise HTTPException(status_code=400, detail="Cannot demote the sole administrator.")

    db_user.role = user_update.role
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user
