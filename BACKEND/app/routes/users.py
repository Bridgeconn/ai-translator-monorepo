from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.crud.users import UserOperations, create_user
from app.schemas.users import UserResponse, UserCreate
from app.database import get_db
from fastapi.responses import JSONResponse
from app.models.users import User
from fastapi.encoders import jsonable_encoder


router = APIRouter(prefix="/users", tags=["Users"])

# Get all users, get user by ID, username, or email

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


# Create a new user

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "User created successfully."},
        409: {"description": "Username or email already registered."},
        500: {"description": "Server error during user creation."}
    }
)
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    create_user(db=db, user=user)
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"message": "User created successfully."}
    )