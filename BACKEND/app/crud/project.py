from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException
from app.models import project as models
from app.schemas import project as schemas
from app.models import sources as source_models
from app.models import languages as language_models
from app.schemas import project as schemas

def create_project(db: Session, project: schemas.ProjectCreate):
     # Validate selected_books not empty
    if not project.selected_books or len(project.selected_books) == 0:
        raise HTTPException(status_code=400, detail="selected_books cannot be empty")

    # Validate source_id exists
    source = db.query(source_models.Source).filter(source_models.Source.source_id == project.source_id).first()
    if not source :
        raise HTTPException(status_code=400, detail=f"Invalid source_id: {project.source_id} not found")

    # Validate target_language_id exists
    target_lang = db.query(language_models.Language).filter(language_models.Language.language_id == project.target_language_id).first()
    if not target_lang:
        raise HTTPException(status_code=400, detail=f"Invalid target_language_id: {project.target_language_id} not found ")

    db_project = models.Project(
        name=project.name,
        source_id=project.source_id,
        target_language_id=project.target_language_id,
        translation_type=project.translation_type,
        selected_books=project.selected_books,
        status="created",
        progress=0,
        total_items=0,          # no verse count logic
        completed_items=0,
        is_active=project.is_active
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def get_project(db: Session, project_id: UUID):
    db_project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail=f"Project with id {project_id} not found")
    return db_project


def get_projects(db: Session):
    projects = db.query(models.Project).all()
    if not projects:
        raise HTTPException(status_code=404, detail="No projects found")
    return projects
def get_projects_by_source_id(db: Session, source_id: UUID):
    projects = db.query(models.Project).filter(models.Project.source_id == source_id).all()
    if not projects:
        raise HTTPException(status_code=404, detail=f"No projects found for source_id {source_id}")
    return projects    

def update_project(db: Session, project_id: UUID, project: schemas.ProjectUpdate):
    db_project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail=f"Project with id {project_id} not found")

    for var, value in vars(project).items():
        if value is not None:
            setattr(db_project, var, value)

    db.commit()
    db.refresh(db_project)
    return db_project


def delete_project(db: Session, project_id: UUID):
    db_project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail=f"Project with id {project_id} not found")

    db.delete(db_project)
    db.commit()
    return db_project