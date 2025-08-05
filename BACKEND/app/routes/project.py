from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.schemas.project import ProjectResponse, SuccessResponse
from app.database import get_db
from app.schemas import project as schemas
from app.crud import project as crud
from app.dependencies.token import get_current_user  # Adjust path if needed
from app.models.users import User  # Your User model

router = APIRouter()
@router.post("/", response_model=SuccessResponse[ProjectResponse])
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db),
     current_user: User = Depends(get_current_user)):
    db_project = crud.create_project(db, project)
    project_data = ProjectResponse.from_orm(db_project)
    return {"message": "Project created successfully", "data": project_data}


@router.get("/{project_id}", response_model=SuccessResponse)
def get_project(project_id: UUID, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    db_project = crud.get_project(db, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    # return {"message": "Project fetched successfully", "data": db_project}
    return {"message": "Projects fetched successfully", "data": [schemas.ProjectResponse.from_orm(db_project)]}


@router.get("/", response_model=SuccessResponse)
def list_projects(db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    projects = crud.get_projects(db)
    # return {"message": "Projects fetched successfully", "data": projects}
    return {"message": "Projects fetched successfully", "data": [schemas.ProjectResponse.from_orm(p) for p in projects]}


@router.put("/{project_id}", response_model=SuccessResponse)
def update_project(project_id: UUID, project: schemas.ProjectUpdate, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    db_project = crud.update_project(db, project_id, project)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    # return {"message": "Project updated successfully", "data": db_project}
    return {"message": "Project updated successfully", "data": schemas.ProjectResponse.from_orm(db_project)}


@router.delete("/{project_id}", response_model=SuccessResponse)
def delete_project(project_id: UUID, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    db_project = crud.delete_project(db, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    # return {"message": "Project deleted successfully", "data": db_project}
    return {"message": "Project deleted successfully", "data": schemas.ProjectResponse.from_orm(db_project)}

