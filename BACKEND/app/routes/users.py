from fastapi import APIRouter,HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from uuid import UUID
from app.models.users import User
from fastapi.encoders import jsonable_encoder
from app.schemas.users import UserCreate,UserUpdate, ErrorResponse, SuccessResponse

from app.crud.users import user_service, delete_user_by_id


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



@router.put(
    "/{user_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user",
)
def update_user_endpoint(
    user_id: str,
    updates: UserUpdate,
    db: Session = Depends(get_db),
):
    """
        Updating a user details
        """
    user_id = user_id.strip()    
    db_user = user_service.update_user(db, user_id, updates)  
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        'message': "User Updated Successfully",
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


@router.get("/", summary="Get all users")
def get_all_users(db: Session = Depends(get_db)):
    users = user_service.get_all_users(db)
    return users

@router.get("/id/{user_id}", summary="Get user by ID")
def get_user_by_id(user_id: str, db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/username/{username}", summary="Get user by username")
def get_user_by_username(username: str, db: Session = Depends(get_db)):
    user = user_service.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/email/{email}", summary="Get user by email")
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = user_service.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

