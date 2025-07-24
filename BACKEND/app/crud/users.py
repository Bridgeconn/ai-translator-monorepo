from sqlalchemy.orm import Session
from passlib.context import CryptContext
from sqlalchemy.exc import SQLAlchemyError  
from fastapi import HTTPException
from app.models.users import User  
from app.schemas.schemas import UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def update_user(
    db: Session,
    user_id: str,
    updates: UserUpdate,
) -> User | None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if updates.username is not None:
        user.username = updates.username
    if updates.email is not None:
        user.email = updates.email
    if updates.full_name is not None:
        user.full_name = updates.full_name
    if updates.password is not None:
        user.password_hash = pwd_context.hash(updates.password)
    if updates.role is not None:
        user.role = updates.role

    if updates.username:
        existing = db.query(User).filter(User.username == updates.username).first()
        if existing and existing.id != user.id:
            raise HTTPException(status_code=409, detail="Username already exists.")
    
    if updates.email:
        existing = db.query(User).filter(User.email == updates.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
    

    try:
        db.commit()
        db.refresh(user)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while updating user")

    return user
