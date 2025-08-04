from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
import uuid

class ProjectCRUD:

    @staticmethod
    def create_project(db: Session, project_data: ProjectCreate) -> Project:
        db_project = Project(
            project_id=uuid.uuid4(),
            name=project_data.name,
            source_id=project_data.source_id,
            target_language_id=project_data.target_language_id,
            translation_type=project_data.translation_type,
            selected_books=project_data.selected_books,
            status=project_data.status,
            progress=project_data.progress,
            total_items=project_data.total_items,
            completed_items=project_data.completed_items,
            is_active=project_data.is_active
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        return db_project

    @staticmethod
    def get_projects(db: Session, skip: int = 0, limit: int = 10) -> List[Project]:
        return db.query(Project).offset(skip).limit(limit).all()

    @staticmethod
    def get_project_by_id(db: Session, project_id: UUID) -> Optional[Project]:
        return db.query(Project).filter(Project.project_id == project_id).first()

    @staticmethod
    def update_project(db: Session, project_id: UUID, updates: ProjectUpdate) -> Optional[Project]:
        db_project = db.query(Project).filter(Project.project_id == project_id).first()
        if not db_project:
            return None
        for field, value in updates.dict(exclude_unset=True).items():
            setattr(db_project, field, value)
        db.commit()
        db.refresh(db_project)
        return db_project

    @staticmethod
    def delete_project(db: Session, project_id: UUID) -> Optional[Project]:
        db_project = db.query(Project).filter(Project.project_id == project_id).first()
        if not db_project:
            return None
        db.delete(db_project)
        db.commit()
        return db_project

    @staticmethod
    def get_active_projects(db: Session) -> List[Project]:
        return db.query(Project).filter(Project.is_active == True).all()