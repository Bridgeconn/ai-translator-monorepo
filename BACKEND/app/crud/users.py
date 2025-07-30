from sqlalchemy.orm import Session
from uuid import UUID
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException, status
from passlib.context import CryptContext
from app.models.users import User 
from app.schemas.users import UserCreate, UserUpdate
from typing import Optional, List
from app.utils.auth import pwd_context


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    def get_user_by_username(self, db: Session, username: str) -> Optional[User]: # adding self 
        return db.query(User).filter(User.username == username).first()

    def get_user_by_email(self,db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def get_user_by_id(self,db: Session, user_id) -> Optional[User]:
        return db.query(User).filter(User.user_id== user_id).first()

    def get_all_users(self,db: Session) -> List[User]:
        return db.query(User).all()
    
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
        
    def update_user(self, db: Session, user_id: UUID, updates: UserUpdate) -> User:
        user = db.query(User).filter(User.user_id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check for username/email conflicts
        if updates.username:
            existing = db.query(User).filter(User.username == updates.username, user_id != User.user_id).first()
            if existing:
                raise HTTPException(status_code=409, detail="Username already registered")

        # if updates.email:
        #     existing = db.query(User).filter(User.username == updates.username, user_id != User.user_id).first()
        if updates.email:
            existing = db.query(User).filter(User.email == updates.email, User.user_id != user_id).first()

            if existing:
                raise HTTPException(status_code=409, detail="Email already registered")

        # Apply updates
        for attr, value in updates.dict(exclude_unset=True).items():
            if attr == "password":
                setattr(user, "password_hash", pwd_context.hash(value))
            else:
                setattr(user, attr, value)

        try:
            db.commit()
            db.refresh(user)
            return user
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(status_code=500, detail="Database error while updating user")

# Singleton instance for import elsewhere
def delete_user_by_id(db: Session, user_id: UUID) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    db.delete(user)
    db.commit()
    return user


user_service = UserService()

## changed id to user_id as per schema 