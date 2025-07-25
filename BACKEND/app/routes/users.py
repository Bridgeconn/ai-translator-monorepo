from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from app.database import get_db
from app.schemas.users import UserCreate,UserUpdate,UserResponse
from app.crud.users import create_user
from app.models.users import User
from app.crud.users import update_user
from fastapi.encoders import jsonable_encoder

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "User created successfully."},
        409: {"description": "Username or email already registered."},
        500: {"description": "Server error during user creation."}
    }
)
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    create_user(db=db, user=user)
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"message": "User created successfully."}
    )


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
