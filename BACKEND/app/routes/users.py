from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud.users import delete_user_by_id
from uuid import UUID

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.delete("/{user_id}")
def delete_user_route(user_id: UUID, db: Session = Depends(get_db)):
    return delete_user_by_id(db, user_id)
