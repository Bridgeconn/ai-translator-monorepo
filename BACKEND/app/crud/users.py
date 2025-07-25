from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from app.models import users,User
from app.schemas.users import UserCreate,UserUpdate
from sqlalchemy.exc import SQLAlchemyError  

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def create_user(db: Session, user: UserCreate):
    username_exists = db.query(users.User).filter(users.User.username == user.username).first()
    email_exists = db.query(users.User).filter(users.User.email == user.email).first()

    errors = []
    if username_exists:
        errors.append("Username already registered.")
    if email_exists:
        errors.append("Email already registered.")

    if errors:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=errors[0]
        )

    hashed_password = pwd_context.hash(user.password)
    new_user = users.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        role=user.role
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role
        }
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong while saving the user."
        )


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
