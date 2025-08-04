from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.crud.project import ProjectCRUD
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    return ProjectCRUD.create_project(db, project)

@router.get("/", response_model=List[ProjectOut])
def get_projects(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return ProjectCRUD.get_projects(db, skip, limit)

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: UUID, db: Session = Depends(get_db)):
    db_project = ProjectCRUD.get_project_by_id(db, project_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return db_project

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(project_id: UUID, updates: ProjectUpdate, db: Session = Depends(get_db)):
    db_project = ProjectCRUD.update_project(db, project_id, updates)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return db_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: UUID, db: Session = Depends(get_db)):
    db_project = ProjectCRUD.delete_project(db, project_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return None
