from fastapi import APIRouter, Depends, HTTPException, status, Query,Body
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.project_text_document import ProjectTextDocument
from app.database import get_db
from app.models.users import User
from app.dependencies.token import get_current_user
from app.schemas.project_text_document import (
    ProjectTextDocumentCreate, ProjectTextDocumentResponse,
    ProjectFileResponse, SuccessResponse, ProjectSummaryResponse, ProjectFileData, FileUpdate
)
from app.crud import project_text_document as crud
from typing import List, Optional

router = APIRouter()

@router.post("/", response_model=SuccessResponse[dict])
def create_or_add_files(
    request: ProjectTextDocumentCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new text document project or return error if project exists"""
    try:
        existing_project = crud.get_project_by_name(db, request.project_name)
        
        if existing_project:
            # Raise error instead of returning success
            raise HTTPException(
                status_code=400,
                detail=f"Project '{request.project_name}' already exists."
            )
        
        #  Create new project with files
        project_id, files = crud.create_project_with_files(
            db, request.project_name, request.files, current_user.user_id
        )
        return SuccessResponse(
            message=f"New project '{request.project_name}' created successfully with {len(files)} files.",
            data={
                "status": "created",
                "project_id": str(project_id),
                "project_type": "text_document",
                "translation_type": "text_document",
                "files_created": len(files),
            },
        )
    except HTTPException:
        # Re-raise known errors without wrapping
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating project: {str(e)}"
        )
@router.post("/{project_id}/add-files", response_model=SuccessResponse[dict])
def add_files_to_existing(
    project_id: str, 
    request: ProjectTextDocumentCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add files to an existing text document project"""
    try:
        new_files = crud.add_files_to_existing_project(
            db, project_id, request.project_name, request.files, current_user.user_id
        )
        
        # Convert ORM objects to Pydantic response
        files_response = [ProjectFileResponse.from_orm(f).dict() for f in new_files]
        
        return SuccessResponse(
            message=f"Successfully added {len(new_files)} files to project '{request.project_name}'",
            data={
                "status": "success", 
                "added_files": files_response,  # full objects here
                "files_added": len(new_files)
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding files: {str(e)}")


@router.get("/{project_id}", response_model=ProjectTextDocumentResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    """
    Fetch a text document project along with all its files.
    """

    # Fetch all files for the given project_id
    files = (
        db.query(ProjectTextDocument)
        .filter(
            ProjectTextDocument.project_id == project_id,
            ProjectTextDocument.project_type == "text_document"
        )
        .all()
    )

    if not files:
        raise HTTPException(
            status_code=404,
            detail=f"Project with ID {project_id} not found"
        )

    # Convert ORM files to Pydantic responses
    response_files: List[ProjectFileResponse] = [
        ProjectFileResponse.from_orm(f) for f in files
    ]

    # Use the first file as reference for project metadata
    first_file = files[0]

    project_response = ProjectTextDocumentResponse(
        project_id=first_file.project_id,   # no forced UUID()
        project_name=first_file.project_name,
        project_type="text_document",
        translation_type="text_document",
        files=response_files,
        created_at=first_file.created_at,
        updated_at=first_file.updated_at,
    )

    return project_response

@router.get("/", response_model=SuccessResponse[List[ProjectTextDocumentResponse]])
def fetch_all_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    summary_only: bool = Query(False, description="Return only summary information")
):
    """Fetch all text document projects"""
    try:
        if summary_only:
            projects_summary = crud.get_all_projects_summary(db, project_type="text_document")
            return SuccessResponse(
                message=f"Successfully fetched {len(projects_summary)} text document projects (summary)",
                data=projects_summary
            )
        else:
            projects = crud.get_all_projects(db,current_user.user_id, project_type="text_document")
            
            if not projects:
                return SuccessResponse(
                    message="No text document projects found", 
                    data=[]
                )
            
            return SuccessResponse(
                message=f"Successfully fetched {len(projects)} text document projects",
                data=projects
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching projects: {str(e)}")


@router.put("/{project_id}/files/{file_id}", response_model=ProjectFileResponse)
async def update_file(
    project_id: UUID,
    file_id: UUID,
    file_data: FileUpdate,   
    db: Session = Depends(get_db),
):
    db_file = db.query(ProjectTextDocument).filter(
        ProjectTextDocument.project_id == project_id,
        ProjectTextDocument.id == file_id
    ).first()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    if file_data.target_text is not None:
        db_file.target_text = file_data.target_text

    db.commit()
    db.refresh(db_file)

    return db_file
