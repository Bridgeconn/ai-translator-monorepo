from sqlalchemy.orm import Session
from uuid import UUID
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from passlib.context import CryptContext
from app.models.users import User
from app.schemas.users import UserCreate
from typing import Optional


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    def get_user_by_username(self, db: Session, username: str):
        return db.query(User).filter(User.username == username).first()

    def get_user_by_email(self, db: Session, email: str):
        return db.query(User).filter(User.email == email).first()
    
    def create_user(self, db: Session, user: UserCreate) -> User:  
        username_exists = db.query(User).filter(User.username == user.username).first()
        email_exists = db.query(User).filter(User.email == user.email).first()

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
        new_user = User(
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
            return new_user
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
def delete_user_by_id(db: Session, user_id: UUID) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    db.delete(user)
    db.commit()
    return user

       

user_service = UserService()