from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException
from app.models import project as models
from app.schemas import project as schemas
def create_project(db: Session, project: schemas.ProjectCreate):
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
    return db.query(models.Project).filter(models.Project.project_id == project_id).first()


def get_projects(db: Session):
    return db.query(models.Project).all()

def get_projects_by_source_id(db: Session, source_id: UUID):
    return db.query(models.Project).filter(models.Project.source_id == source_id).all()
    

def update_project(db: Session, project_id: UUID, project: schemas.ProjectUpdate):
    db_project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not db_project:
        return None

    for var, value in vars(project).items():
        if value is not None:
            setattr(db_project, var, value)

    db.commit()
    db.refresh(db_project)
    return db_project


def delete_project(db: Session, project_id: UUID):
    db_project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not db_project:
        return None

    db.delete(db_project)
    db.commit()
    return db_project
