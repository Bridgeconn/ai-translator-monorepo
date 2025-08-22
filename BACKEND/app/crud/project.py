from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException
from app.schemas import project as schemas
from app.models import sources as source_models, languages as language_models, project as project_models
def get_existing_project(db: Session, name: str, source_id: UUID, target_language_id: UUID, translation_type: str):
    return db.query(project_models.Project).filter(
        project_models.Project.name == name,
        project_models.Project.source_id == source_id,
        project_models.Project.target_language_id == target_language_id,
        project_models.Project.translation_type == translation_type
    ).first()

def create_project(db: Session, project: schemas.ProjectCreate):
      # ✅ Check if project already exists with same name, source, target and type
    existing = get_existing_project(db, project.name, project.source_id, project.target_language_id, project.translation_type)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Project with name '{project.name}', source '{project.source_id}', "
                   f"target '{project.target_language_id}' and type '{project.translation_type}' already exists"
        )

    # Validate source_id exists
    source = db.query(source_models.Source).filter(source_models.Source.source_id == project.source_id).first()
    if not source :
        raise HTTPException(status_code=400, detail=f"Invalid source_id: {project.source_id} not found")

    # Validate target_language_id exists
    target_lang = db.query(language_models.Language).filter(language_models.Language.language_id == project.target_language_id).first()
    if not target_lang:
        raise HTTPException(status_code=400, detail=f"Invalid target_language_id: {project.target_language_id} not found ")

    # Validate translation_type
    if project.translation_type not in ["verse", "word"]:
        raise HTTPException(status_code=400, detail=f"Invalid translation_type: {project.translation_type}")

    db_project = project_models.Project(
        name=project.name,
        source_id=project.source_id,
        target_language_id=project.target_language_id,
        translation_type=project.translation_type,
        selected_books=project.selected_books,
        status="created",
        progress=0,
        total_items=0,
        completed_items=0,
        is_active= True
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def get_project_by_id(db: Session, project_id: UUID):
    db_project = db.query(project_models.Project).filter(project_models.Project.project_id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail=f"Project with id {project_id} not found")
    return db_project


def get_projects(db: Session):
    projects = db.query(project_models.Project).all()
    if not projects:
        raise HTTPException(status_code=404, detail="No projects found")
    return projects
def get_projects_by_source_id(db: Session, source_id: UUID):
    projects = db.query(project_models.Project).filter(project_models.Project.source_id == source_id).all()
    if not projects:
        raise HTTPException(status_code=404, detail=f"No projects found for source_id {source_id}")
    return projects    

def update_project(db: Session, project_id: UUID, project: schemas.ProjectUpdate):
    # Fetch the existing project
    db_project = db.query(project_models.Project).filter(
        project_models.Project.project_id == project_id
    ).first()
    if not db_project:
        raise HTTPException(status_code=404, detail=f"Project with id {project_id} not found")

    # Determine new values (use old values if not provided)
    new_name = project.name if project.name is not None else db_project.name
    new_source_id = project.source_id if project.source_id is not None else db_project.source_id
    new_target_language_id = project.target_language_id if project.target_language_id is not None else db_project.target_language_id
    new_translation_type = project.translation_type if project.translation_type is not None else db_project.translation_type
    new_selected_books = project.selected_books if project.selected_books is not None else db_project.selected_books
    new_status = project.status if project.status is not None else db_project.status
    new_is_active = project.is_active if project.is_active is not None else db_project.is_active

    # Validate source_id exists
    source = db.query(source_models.Source).filter(source_models.Source.source_id == new_source_id).first()
    if not source:
        raise HTTPException(status_code=400, detail=f"Invalid source_id: {new_source_id} not found")

    # Validate target_language_id exists
    target_lang = db.query(language_models.Language).filter(language_models.Language.language_id == new_target_language_id).first()
    if not target_lang:
        raise HTTPException(status_code=400, detail=f"Invalid target_language_id: {new_target_language_id} not found")

    # Validate translation_type
    if new_translation_type not in ["verse", "word"]:
        raise HTTPException(status_code=400, detail=f"Invalid translation_type: {new_translation_type}")

    # Check if nothing changed
    import json
    if (
        new_name == db_project.name and
        new_source_id == db_project.source_id and
        new_target_language_id == db_project.target_language_id and
        new_translation_type == db_project.translation_type and
        json.dumps(new_selected_books) == json.dumps(db_project.selected_books) and
        new_status == db_project.status and
        new_is_active == db_project.is_active
    ):
        raise HTTPException(
            status_code=400,
            detail="Nothing to update. All values are the same as the current project."
        )

    # Check uniqueness against other projects
    existing = db.query(project_models.Project).filter(
        project_models.Project.name == new_name,
        project_models.Project.source_id == new_source_id,
        project_models.Project.target_language_id == new_target_language_id,
        project_models.Project.translation_type == new_translation_type,
        project_models.Project.project_id != project_id  # exclude self
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Project with name '{new_name}', source '{new_source_id}', "
                   f"target '{new_target_language_id}' and type '{new_translation_type}' already exists"
        )

    # Update fields
    for var, value in vars(project).items():
        if value is not None:
            setattr(db_project, var, value)

    db.commit()
    db.refresh(db_project)
    return db_project



def delete_project(db: Session, project_id: UUID):
    db_project = db.query(project_models.Project).filter(project_models.Project.project_id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail=f"Project with id {project_id} not found")

    db.delete(db_project)
    db.commit()
    return db_project