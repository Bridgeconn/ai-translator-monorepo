from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional, Dict, Any, Union
from fastapi import HTTPException
from datetime import datetime
from app.schemas import project as schemas
from app.models import sources as source_models, languages as language_models, project as project_models
from app.models import verse as verse_models, chapter as chapter_models, book as book_models, books_details as book_details_models
from app.models.project_text_document import ProjectTextDocument
from app.schemas.project import ProjectCreate
import uuid
from uuid import uuid4
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.schemas.project_text_document import (
    ProjectTextDocumentResponse, ProjectFileResponse, ProjectFileData
)

def create_project(db: Session, project: ProjectCreate, user_id: UUID, files: List[Union[ProjectFileData, Dict[str, Any]]] = None):
    # ---------------- Validate source ----------------
    source = db.query(source_models.Source).filter(
        source_models.Source.source_id == project.source_id
    ).first()
    if not source:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source_id: {project.source_id} not found",
        )

    # ---------------- Validate target ----------------
    target_lang = db.query(language_models.Language).filter(
        language_models.Language.language_id == project.target_language_id
    ).first()
    if not target_lang:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid target_language_id: {project.target_language_id} not found",
        )

    # ---------------- Handle text_document ----------------
    if project.translation_type == "text_document":
        # Resolve source + target BCP codes
        source_lang = db.query(language_models.Language).filter(
            language_models.Language.language_id == source.language_id
        ).first()
        source_bcp_code = source_lang.BCP_code if source_lang else None
        target_bcp_code = target_lang.BCP_code
    
        if not source_bcp_code or not target_bcp_code:
            raise HTTPException(
                status_code=400,
                detail="Could not determine language BCP codes"
            )
    
        # Prevent duplicate project with same owner + source/target combo
        existing_text_project = db.query(ProjectTextDocument).filter(
            ProjectTextDocument.owner_id == user_id,
            ProjectTextDocument.source_id == source_bcp_code,
            ProjectTextDocument.target_id == target_bcp_code,
            ProjectTextDocument.project_type == "text_document"
        ).first()
        if existing_text_project:
            raise HTTPException(
                status_code=400,
                detail="A text document project with the same source and target language already exists."
            )
    
        project_id = str(uuid4())
        created_files = []
    
        try:
            if not files or len(files) == 0:
                # Create a default empty file if no files provided
                files = [{"file_name": "sample.txt", "source_text": "sample test data", "target_text": ""}]
    
            for file_data in files:
                if isinstance(file_data, ProjectFileData):
                    file_dict = file_data.dict()
                else:
                    file_dict = file_data
    
                new_file = ProjectTextDocument(
                    project_id=project_id,
                    owner_id=user_id,
                    project_name=project.name,
                    project_type="text_document",
                    translation_type="text_document",
                    file_name=file_dict.get("file_name", "sample.txt"),
                    source_id=source_bcp_code,
                    target_id=target_bcp_code, 
                    source_text=file_dict.get("source_text", ""),
                    target_text=file_dict.get("target_text", ""),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(new_file)
                created_files.append(new_file)
    
            db.commit()
            for file_obj in created_files:
                db.refresh(file_obj)
    
            return {
                "project_id": project_id,
                "files": created_files,
                "source": {"id": source.source_id, "name": source.language_name},
                "target": {"id": target_lang.language_id, "name": target_lang.name},
            }
    
        except Exception as e:
            db.rollback()
            raise e


    # ---------------- Handle verse/word projects ----------------
    elif project.translation_type in ["verse", "word"]:
        source_lang_id = db.query(source_models.Source.language_id).filter(
            source_models.Source.source_id == project.source_id
        ).scalar()

        if not source_lang_id:
            raise HTTPException(status_code=400, detail="Invalid source_id or missing language_id")

        source_lang = db.query(language_models.Language).filter(
            language_models.Language.language_id == source_lang_id
        ).first()
        target_lang = db.query(language_models.Language).filter(
            language_models.Language.language_id == project.target_language_id
        ).first()

        source_lang_name = source_lang.name if source_lang else "Unknown Source Language"
        target_lang_name = target_lang.name if target_lang else "Unknown Target Language"

        existing = (
            db.query(project_models.Project)
            .join(source_models.Source, source_models.Source.source_id == project_models.Project.source_id)
            .filter(
                source_models.Source.language_id == source_lang_id,
                project_models.Project.target_language_id == project.target_language_id,
                project_models.Project.translation_type == project.translation_type,
                project_models.Project.owner_id == user_id

            )
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"A project already exists with the same source language ({source_lang_name}), "
                    f"target language ({target_lang_name}), and translation type ({project.translation_type})."
                ),
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
            owner_id=user_id,
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        return get_project_by_id(db, db_project.project_id)



    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid translation_type: {project.translation_type}",
        )

 
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
 
 
def get_projects(db: Session, user_id: UUID):
    projects = db.query(project_models.Project).filter(
        project_models.Project.owner_id == user_id
    ).all()

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