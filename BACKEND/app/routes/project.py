from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.schemas.project import ProjectResponse, SuccessResponse, ProjectCreate, ProjectUpdate
from app.database import get_db
from app.crud import project as crud
from app.dependencies.token import get_current_user 
from app.models.users import User

router = APIRouter()

@router.post("/", response_model=SuccessResponse[ProjectResponse])
def create_project(
    project: ProjectCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if not project.name or not project.source_id or not project.target_language_id:
        raise HTTPException(status_code=400, detail="Name, source_id and target_language_id are required")
    db_project = crud.create_project(db, project)
    project_data = ProjectResponse.from_orm(db_project)
    return {"message": "Project created successfully", "data": project_data}


@router.get("/{project_id}", response_model=SuccessResponse[ProjectResponse])
def get_project_id(project_id: UUID, db: Session = Depends(get_db)):
    db_project = crud.get_project_by_id(db, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 🔑 Use dict() so enriched fields get included
    project_data = ProjectResponse.from_orm(db_project).dict()
    project_data["source_language_name"] = getattr(db_project, "source_language_name", None)
    project_data["target_language_name"] = getattr(db_project, "target_language_name", None)
    project_data["source_text"] = getattr(db_project, "source_text", None)

    return {"message": "Project fetched successfully", "data": project_data}


@router.get("/", response_model=SuccessResponse[list[ProjectResponse]])
def list_projects(db: Session = Depends(get_db)):
    projects = crud.get_projects(db)
    return {"message": "Projects fetched successfully", "data": [ProjectResponse.from_orm(p) for p in projects]}


@router.get("/by-source/{source_id}", response_model=SuccessResponse[list[ProjectResponse]])
def get_projects_by_source_id(
    source_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = crud.get_projects_by_source_id(db, source_id)
    if not projects:
        raise HTTPException(status_code=404, detail="No projects found for this source_id")
    return {
        "message": "Projects fetched successfully",
        "data": [ProjectResponse.from_orm(p) for p in projects]
    }


@router.put("/{project_id}", response_model=SuccessResponse[ProjectResponse])
def update_project(
    project_id: UUID, 
    project: ProjectUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_project = crud.update_project(db, project_id, project)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project updated successfully", "data": ProjectResponse.from_orm(db_project)}
#,current_user: User = Depends(get_current_user)

@router.delete("/{project_id}", response_model=SuccessResponse[ProjectResponse])
def delete_project(
    project_id: UUID, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_project = crud.delete_project(db, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully", "data": ProjectResponse.from_orm(db_project)}

#,current_user: User = Depends(get_current_user)