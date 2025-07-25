from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
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