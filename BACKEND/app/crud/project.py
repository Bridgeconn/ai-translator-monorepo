from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException
from app.schemas import project as schemas
from app.models import sources as source_models, languages as language_models, project as project_models
from app.models import verse as verse_models, chapter as chapter_models, book as book_models, books_details as book_details_models


def create_project(db: Session, project: schemas.ProjectCreate):
    # Validate source_id exists
    source = db.query(source_models.Source).filter(
        source_models.Source.source_id == project.source_id
    ).first()
    if not source:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source_id: {project.source_id} not found",
        )

    # Validate target_language_id exists
    target_lang = (
        db.query(language_models.Language)
        .filter(language_models.Language.language_id == project.target_language_id)
        .first()
    )
    if not target_lang:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid target_language_id: {project.target_language_id} not found ",
        )

    # Validate translation_type
    if project.translation_type not in ["verse", "word"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid translation_type: {project.translation_type}",
        )

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
        is_active=True,
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def get_project_by_id(db: Session, project_id: UUID):
    db_project = (
        db.query(project_models.Project)
        .filter(project_models.Project.project_id == project_id)
        .first()
    )
    if not db_project:
        raise HTTPException(
            status_code=404, detail=f"Project with id {project_id} not found"
        )

    # --- Enrich with language names ---
    source_lang = (
        db.query(language_models.Language)
        .filter(language_models.Language.language_id == db_project.source.language_id)
        .first()
    )
    target_lang = (
        db.query(language_models.Language)
        .filter(language_models.Language.language_id == db_project.target_language_id)
        .first()
    )

    # --- Collect verses for selected_books ---
    source_text = None
    if db_project.selected_books:
        verses_query = (
            db.query(
                verse_models.Verse.content,
                book_details_models.BookDetail.book_number,
            )
            .join(
                chapter_models.Chapter,
                chapter_models.Chapter.chapter_id == verse_models.Verse.chapter_id,
            )
            .join(book_models.Book, book_models.Book.book_id == chapter_models.Chapter.book_id)
            .join(
                book_details_models.BookDetail,
                book_details_models.BookDetail.book_code == book_models.Book.book_code,
            )
            .filter(book_models.Book.source_id == db_project.source_id)
            .filter(book_details_models.BookDetail.book_name.in_(db_project.selected_books))
            .order_by(
                book_details_models.BookDetail.book_number,
                chapter_models.Chapter.chapter_number,
                verse_models.Verse.verse_number,
            )
            .all()
        )
        source_text = "\n".join([v.content for v in verses_query])

    # Attach extras dynamically
    db_project.source_language_name = source_lang.name if source_lang else None
    db_project.target_language_name = target_lang.name if target_lang else None
    db_project.source_text = source_text

    return db_project


def get_projects(db: Session):
    projects = db.query(project_models.Project).all()
    if not projects:
        raise HTTPException(status_code=404, detail="No projects found")
    return projects


def get_projects_by_source_id(db: Session, source_id: UUID):
    projects = (
        db.query(project_models.Project)
        .filter(project_models.Project.source_id == source_id)
        .all()
    )
    if not projects:
        raise HTTPException(
            status_code=404, detail=f"No projects found for source_id {source_id}"
        )
    return projects


def update_project(db: Session, project_id: UUID, project: schemas.ProjectUpdate):
    db_project = (
        db.query(project_models.Project)
        .filter(project_models.Project.project_id == project_id)
        .first()
    )
    if not db_project:
        raise HTTPException(
            status_code=404, detail=f"Project with id {project_id} not found"
        )

    for var, value in vars(project).items():
        if value is not None:
            setattr(db_project, var, value)

    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: UUID):
    db_project = (
        db.query(project_models.Project)
        .filter(project_models.Project.project_id == project_id)
        .first()
    )
    if not db_project:
        raise HTTPException(
            status_code=404, detail=f"Project with id {project_id} not found"
        )

    db.delete(db_project)
    db.commit()
    return db_project
