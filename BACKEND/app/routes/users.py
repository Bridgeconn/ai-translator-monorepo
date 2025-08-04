from fastapi import APIRouter,HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.models.users import User
from app.database import get_db
from uuid import UUID
from app.schemas.users import UserCreate,UserUpdate, ErrorResponse, SuccessResponse,MessageResponse,UserResponse
from app.dependencies.token import get_current_user
from app.crud.users import user_service, delete_user_by_id

from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

router = APIRouter()

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user



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



@router.put(
    "/{user_id}",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user",
)
def update_user_endpoint(
    user_id: str,
    updates: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
        Updating a user details
        """
    user_id = user_id.strip()    
    db_user = user_service.update_user(db, user_id, updates)  
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        'message': "User Updated Successfully",
        "data": db_user
    }


@router.delete(
    "/{user_id}",
    response_model=SuccessResponse,
    responses={404: {"model": ErrorResponse}},
    status_code=status.HTTP_200_OK,
    summary="Delete user by ID"
)
def delete_user_route(user_id: UUID, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    """
    Delete a user by their UUID.
    Returns success response if deleted, else 404 error.
    """
    deleted_user = delete_user_by_id(db, user_id)
    if deleted_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "message": f"User with ID {user_id} deleted successfully.",
        "data": deleted_user
    }


@router.get("/", summary="Get all users")
def get_all_users(db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    users = user_service.get_all_users(db)
    return users

@router.get("/id/{user_id}",response_model=SuccessResponse,responses={404: {"model": ErrorResponse}}, summary="Get user by ID")###
def get_user_by_id(user_id: str, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"data": user, "message": "User fetched successfully"} ###

@router.get("/username/{username}",response_model=SuccessResponse, summary="Get user by username")##
def get_user_by_username(username: str, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    user = user_service.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"data": user, "message": "User fetched successfully"}###

@router.get("/email/{email}",response_model=SuccessResponse, summary="Get user by email")
def get_user_by_email(email: str, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    user = user_service.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"data": user, "message": "User fetched successfully"}### added a message in return 


## added a message in return and add the response model SuccessResponse in fetch user 
## addded current_user from get_current_user as a dependency 
## added a me router to get current user detail
    return db_user

@router.delete(
    "/{user_id}",
    summary="Delete user by ID",
    response_model=MessageResponse
)
def delete_user_route(user_id: UUID, db: Session = Depends(get_db)):
    deleted = delete_user_by_id(db, user_id)
    if deleted:
        return {"detail": f"User with ID {user_id} deleted successfully."}
    raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")
