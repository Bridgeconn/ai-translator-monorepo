from sqlalchemy.orm import Session
from app.models.users import User

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()
