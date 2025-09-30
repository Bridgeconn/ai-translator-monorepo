from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from datetime import datetime
from app.models.project_text_document import ProjectTextDocument
from app.schemas.project_text_document import (
    ProjectTextDocumentResponse, ProjectFileResponse, ProjectFileData
)
from app.crud.languages import language_service

def get_project_by_name(db: Session, project_name: str) -> Optional[ProjectTextDocument]:
    """Get a project by its name"""
    return db.query(ProjectTextDocument).filter(
        ProjectTextDocument.project_name == project_name,
        ProjectTextDocument.project_type == "text_document"
    ).first()

def get_project_by_id(db: Session, project_id: str) -> Optional[ProjectTextDocument]:
    """Get a project by its ID"""
    return db.query(ProjectTextDocument).filter(
        ProjectTextDocument.project_id == project_id,
        ProjectTextDocument.project_type == "text_document"
    ).first()

def create_project_with_files(
    db: Session, 
    project_name: str, 
    files: List[Union[ProjectFileData, Dict[str, Any]]],
    user_id: UUID
):
    """Create a new project with files"""
    import uuid
    from datetime import datetime
    
    # Generate a new project ID
    project_id = str(uuid.uuid4())
    created_files = []
    
    try:
        # Create each file record with the same project_id
        for file_data in files:
            # Handle both Pydantic objects and dictionaries
            if isinstance(file_data, ProjectFileData):
                file_dict = file_data.dict()
            else:
                file_dict = file_data
            
            new_file = ProjectTextDocument(
                project_id=project_id,
                owner_id=user_id,
                project_name=project_name,
                project_type="text_document",  # Set project type
                translation_type="text_document",  # Set translation type
                file_name=file_dict.get('file_name'),
                source_id=file_dict.get('source_id'),
                target_id=file_dict.get('target_id'),
                source_text=file_dict.get('source_text', ''),
                target_text=file_dict.get('target_text'),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_file)
            created_files.append(new_file)
        
        db.commit()
        
        # Refresh all objects to get their IDs
        for file_obj in created_files:
            db.refresh(file_obj)
        
        return project_id, created_files
        
    except Exception as e:
        db.rollback()
        raise e

def add_files_to_existing_project(
    db: Session, 
    project_id: str, 
    project_name: str, 
    files: List[Union[ProjectFileData, Dict[str, Any]]],
    user_id: UUID
):
    """Add files to an existing project"""
    from datetime import datetime
    
    # Verify project exists
    existing_project = db.query(ProjectTextDocument).filter(
        ProjectTextDocument.project_id == project_id,
        ProjectTextDocument.project_type == "text_document",
        ProjectTextDocument.owner_id == user_id
    ).first()

    if not existing_project:
        raise ValueError(f"Text document project with ID {project_id} does not exist")

    # Verify project name matches
    if existing_project.project_name != project_name:
        raise ValueError(
            f"Project name mismatch. Expected '{existing_project.project_name}', got '{project_name}'"
        )

    # Check for language consistency
    existing_files = db.query(ProjectTextDocument).filter(
        ProjectTextDocument.project_id == project_id,
        ProjectTextDocument.owner_id == user_id
    ).all()

    if existing_files:
        # Get the source_id and target_id from the first existing file (assuming consistency)
        project_source_id = existing_files[0].source_id
        project_target_id = existing_files[0].target_id

        for file_data in files:
            if isinstance(file_data, ProjectFileData):
                file_dict = file_data.dict()
            else:
                file_dict = file_data

            file_source_id = file_dict.get('source_id')
            file_target_id = file_dict.get('target_id')

            if file_source_id != project_source_id or file_target_id != project_target_id:
                # Fetch language names for better error message
                try:
                    project_source_name = language_service.get_by_code(db, project_source_id).name
                    project_target_name = language_service.get_by_code(db, project_target_id).name
                    file_source_name = language_service.get_by_code(db, file_source_id).name
                    file_target_name = language_service.get_by_code(db, file_target_id).name
                except:
                    # Fallback to IDs if language not found
                    project_source_name = project_source_id
                    project_target_name = project_target_id
                    file_source_name = file_source_id
                    file_target_name = file_target_id

                raise ValueError(
                    f"Please select a project that has the same source and target languages ({file_source_name} to {file_target_name}) or create a new project. "
                
                )
                
    # CHECK FOR DUPLICATE FILENAMES BEFORE PROCESSING
    for file_data in files:
        if isinstance(file_data, ProjectFileData):
            file_dict = file_data.dict()
        else:
            file_dict = file_data
            
        filename = file_dict.get('file_name')
        
        # Check if filename already exists in this project
        existing_file = db.query(ProjectTextDocument).filter(
            ProjectTextDocument.project_id == project_id,
            ProjectTextDocument.file_name == filename,
            ProjectTextDocument.owner_id == user_id
        ).first()
        
        if existing_file:
            raise ValueError(f"File '{filename}' already exists in project '{project_name}'. Please choose a different filename.")
    
    new_files = []
    
    try:
        # Create each new file record
        for file_data in files:
            # Handle both Pydantic objects and dictionaries
            if isinstance(file_data, ProjectFileData):
                file_dict = file_data.dict()
            else:
                file_dict = file_data

            new_file = ProjectTextDocument(
                project_id=project_id,
                owner_id=user_id,
                project_name=project_name,
                project_type="text_document",
                translation_type="text_document",
                file_name=file_dict.get('file_name'),
                source_id=file_dict.get('source_id'),
                target_id=file_dict.get('target_id'),
                source_text=file_dict.get('source_text', ''),
                target_text=file_dict.get('target_text'),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_file)
            new_files.append(new_file)
        
        db.commit()
        
        # Refresh all objects to get their IDs
        for file_obj in new_files:
            db.refresh(file_obj)
        
        return new_files
    
    except Exception as e:
        db.rollback()
        raise e

def get_all_projects(db: Session, user_id: UUID, project_type: str = "text_document") -> List[ProjectTextDocumentResponse]:
    """
    Fetch all unique projects with their associated files, filtered by project type and owner.
    """
    # Get all unique project IDs and names for text document projects
    unique_projects = db.query(
        ProjectTextDocument.project_id,
        ProjectTextDocument.project_name,
        ProjectTextDocument.project_type,
        ProjectTextDocument.translation_type,
        func.min(ProjectTextDocument.created_at).label('created_at'),
        func.max(ProjectTextDocument.updated_at).label('updated_at')
    ).filter(
        ProjectTextDocument.project_type == project_type,
        ProjectTextDocument.owner_id == user_id  # ✅ filter by owner
    ).group_by(
        ProjectTextDocument.project_id,
        ProjectTextDocument.project_name,
        ProjectTextDocument.project_type,
        ProjectTextDocument.translation_type
    ).all()
    
    projects_list = []
    
    for project in unique_projects:
        # Get all files for this project
        project_files = db.query(ProjectTextDocument).filter(
            ProjectTextDocument.project_id == project.project_id,
            ProjectTextDocument.owner_id == user_id  # ✅ filter by owner
        ).all()
        
        # Create the response object
        project_response = ProjectTextDocumentResponse(
            project_id=project.project_id,
            project_name=project.project_name,
            project_type=project.project_type,
            translation_type=project.translation_type,
            files=[ProjectFileResponse.from_orm(file) for file in project_files],
            created_at=project.created_at,
            updated_at=project.updated_at
        )
        
        projects_list.append(project_response)
    
    return projects_list

def update_file_translation(db: Session, project_id: str, file_id: str, target_text: str):
    """Update the translation text of a file in a project"""
    file_record = db.query(ProjectTextDocument).filter(
        ProjectTextDocument.project_id == project_id,
        ProjectTextDocument.id == file_id
    ).first()

    if not file_record:
        raise ValueError(f"File with ID {file_id} not found in project {project_id}")

    file_record.target_text = target_text
    file_record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(file_record)
    return file_record

def clear_file_content(db: Session, file_id: str):
    """Clear the source and target text of a file"""
    file_record = db.query(ProjectTextDocument).filter(
        ProjectTextDocument.id == file_id
    ).first()

    if not file_record:
        raise ValueError(f"File with ID {file_id} not found")

    file_record.source_text = ""
    file_record.target_text = ""
    file_record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(file_record)
    return file_record
        
def delete_project(db: Session, project_id: str, owner_id: UUID):
    """Delete an entire project (all its files), ensuring ownership"""
    # Check if project exists and is owned by user
    project_files = db.query(ProjectTextDocument).filter(
        ProjectTextDocument.project_id == project_id,
        ProjectTextDocument.owner_id == owner_id
    ).all()

    if not project_files:
        raise ValueError(f"Project with ID {project_id} not found or not owned by user")

    # Delete all files in the project
    for file_record in project_files:
        db.delete(file_record)

    db.commit()

