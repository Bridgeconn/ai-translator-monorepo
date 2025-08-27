from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.dependencies.token import get_current_user
from app.database import get_db
from app.models.users import User
from app.utils.auth import verify_password, create_access_token

router = APIRouter()

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user:
        raise HTTPException(status_code=401, detail="Username entered is wrong")

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Password is wrong for this username")

    # Both username and password are correct
    access_token, jti = create_access_token(data={"sub": str(user.user_id)})
    user.token = access_token
    user.jti = jti
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}
### added logout 
@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.jti = None  #  revoke token
    db.commit()
    return {"message": "Logged out successfully"}
