from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.users import delete_user_by_id
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from app.models.users import User
from fastapi.encoders import jsonable_encoder
from app.schemas.users import UserCreate, UserResponse
from app.crud.users import user_service

router = APIRouter()

@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",    
)
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user with a unique username and email.
    The password will be hashed before storage.
    """
    db_user = user_service.create_user(db=db, user=user)
    return db_user

@router.delete("/{user_id}", summary="Delete user by ID")
def delete_user_route(user_id: UUID, db: Session = Depends(get_db)):
    deleted = delete_user_by_id(db, user_id)
    if deleted:
        return {"detail": f"User with ID {user_id} deleted successfully."}
    raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")