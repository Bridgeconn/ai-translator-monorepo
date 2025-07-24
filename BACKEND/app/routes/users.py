from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import UserUpdate, UserResponse
from app.crud.users import update_user

router = APIRouter(prefix="/users", tags=["users"])

@router.put(
    "/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
def update_user_endpoint(
    user_id: str,
    updates: UserUpdate,
    db: Session = Depends(get_db),
):
        
    user = update_user(db, user_id, updates)  
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
