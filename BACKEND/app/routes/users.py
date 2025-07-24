from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.users import UserOperations
from app.schemas.users import UserResponse
from app.database import get_db

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", summary="Get all users")
def get_all_users(db: Session = Depends(get_db)):
    users = UserOperations.get_all_users(db)
    return users

@router.get("/id/{user_id}", summary="Get user by ID")
def get_user_by_id(user_id: str, db: Session = Depends(get_db)):
    user = UserOperations.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/username/{username}", summary="Get user by username")
def get_user_by_username(username: str, db: Session = Depends(get_db)):
    user = UserOperations.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/email/{email}", summary="Get user by email")
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = UserOperations.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
