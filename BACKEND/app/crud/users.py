from sqlalchemy.orm import Session
from app.models.users import User
from fastapi import HTTPException, status
from uuid import UUID

def delete_user_by_id(db: Session, user_id: UUID):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )

    db.delete(user)
    db.commit()
    return {"message": f"User with ID {user_id} deleted successfully"}
