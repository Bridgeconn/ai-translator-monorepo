from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from app.models import users   # need to check this import path
from app.schemas.users import UserCreate
from app.models.users import User # need to check this import path
from typing import Optional, List

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



class UserOperations:

    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_all_users(db: Session) -> List[User]:
        return db.query(User).all()

