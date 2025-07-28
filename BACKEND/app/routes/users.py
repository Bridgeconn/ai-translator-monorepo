from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.users import delete_user_by_id
from uuid import UUID
from fastapi import APIRouter, Depends, status
from app.schemas.users import UserCreate, ErrorResponse, SuccessResponse
from app.crud.users import user_service

router = APIRouter()

@router.post(
    "/",
    response_model=SuccessResponse,
    responses={
        409: {"model": ErrorResponse}
    },
 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",    
)
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user with a unique username and email.
    The password will be hashed before storage.
    """
    db_user = user_service.create_user(db=db, user=user)
    return {
        'message': "User Created Successfully",
        "data": db_user
    }

@router.delete(
    "/{user_id}",
    response_model=SuccessResponse,
    responses={404: {"model": ErrorResponse}},
    status_code=status.HTTP_200_OK,
    summary="Delete user by ID"
)
def delete_user_route(user_id: UUID, db: Session = Depends(get_db)):
    """
    Delete a user by their UUID.
    Returns success response if deleted, else 404 error.
    """
    deleted_user = delete_user_by_id(db, user_id)
    return {
        "message": f"User with ID {user_id} deleted successfully.",
        "data": deleted_user
    }

