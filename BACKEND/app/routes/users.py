from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.users import UserCreate
from app.crud.users import create_user

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.post("/")
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    return create_user(db=db, user=user)
