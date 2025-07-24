from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.crud.users import get_users
from app.schemas.users import UserOut
from app.database import get_db

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=list[UserOut])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_users(db, skip=skip, limit=limit)
