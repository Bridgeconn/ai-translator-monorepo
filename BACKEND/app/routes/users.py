from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.users import delete_user_by_id
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from app.schemas.users import UserCreate
from app.crud.users import create_user
from app.models.users import User
from fastapi.encoders import jsonable_encoder

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.delete("/{user_id}")
def delete_user_route(user_id: UUID, db: Session = Depends(get_db)):
    return delete_user_by_id(db, user_id)

@router.delete("/{user_id}")
def delete_user_route(user_id: UUID, db: Session = Depends(get_db)):
    return delete_user_by_id(db, user_id)

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
