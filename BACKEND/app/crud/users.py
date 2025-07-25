from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from passlib.context import CryptContext
from app.models import users,User
from app.schemas.users import UserCreate,UserUpdate
from sqlalchemy.exc import SQLAlchemyError  

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
user_service = UserService()
