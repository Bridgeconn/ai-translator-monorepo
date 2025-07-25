from fastapi import APIRouter,HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.users import User
from fastapi.encoders import jsonable_encoder
from app.schemas.users import UserCreate,UserUpdate,UserResponse
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



@router.put(
    "/{user_id}",
    response_model=UserResponse,
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
        
    db_user = user_service.update_user(db, user_id, updates)  
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return db_user
    
