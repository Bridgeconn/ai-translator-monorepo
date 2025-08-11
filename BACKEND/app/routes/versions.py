from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, status, Query
from uuid import UUID
from typing import Optional
from app.database import get_db
from app.schemas.versions import VersionCreate, VersionUpdate, SuccessResponse, ErrorResponse, VersionOut
from app.crud.versions import version_service

router = APIRouter()

# 1. Get all versions
@router.get(
    "/",
    response_model=SuccessResponse,
    summary="List all Bible versions"
)
def list_all_versions(db: Session = Depends(get_db)):
    """
    Get a list of all available Bible versions.
    """
    versions = version_service.get_all_versions(db)
    return {
        "message": "List of versions fetched successfully",
        "data": [v.__dict__ for v in versions]
    }


# 2. Create version
@router.post(
    "/",
    response_model=SuccessResponse,
    responses={409: {"model": ErrorResponse}},
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Bible version"
)
def create_version_route(version: VersionCreate, db: Session = Depends(get_db)):
    """
    Create a new Bible version with a unique abbreviation.
    """
    new_version = version_service.create_version(db, version)
    return {
        "message": "Version created successfully",
        "data": new_version
    }

# 3. Get version by name
@router.get(
    "/by-name/{version_name}",
    response_model=SuccessResponse,
    responses={404: {"model": ErrorResponse}},
    status_code=status.HTTP_200_OK,
    summary="Get version by version_name"
)
def get_version_by_name(version_name: str, db: Session = Depends(get_db)):
    """
    Retrieve a Bible version using its name.
    """
    version = version_service.get_by_version_name(db, version_name)
    return {
        "message": f"Version with name '{version_name}' fetched successfully",
        "data": version
    }

# 4. Get version by abbreviation
@router.get(
    "/by-abbr/{version_abbr}",
    response_model=SuccessResponse,
    responses={404: {"model": ErrorResponse}},
    status_code=status.HTTP_200_OK,
    summary="Get version by version_abbr"
)
def get_version_by_abbr(version_abbr: str, db: Session = Depends(get_db)):
    """
    Retrieve a Bible version using its abbreviation.
    """
    version = version_service.get_by_version_abbr(db, version_abbr)
    return {
        "message": f"Version with abbreviation '{version_abbr}' fetched successfully",
        "data": version
    }

# 5. Get version by ID
@router.get(
    "/{version_id}",
    response_model=SuccessResponse,
    responses={404: {"model": ErrorResponse}},
    status_code=status.HTTP_200_OK,
    summary="Get version by ID"
)
def get_version_by_id(version_id: UUID, db: Session = Depends(get_db)):
    """
    Retrieve a Bible version using its unique ID.
    """
    version = version_service.get_version_by_id(db, version_id)
    return {
        "message": "Version fetched successfully",
        "data": version
    }

# 6. Update version by ID
@router.put(
    "/{version_id}",
    response_model=SuccessResponse,
    responses={404: {"model": ErrorResponse}},
    status_code=status.HTTP_200_OK,
    summary="Update version by ID"
)
def update_version_route(version_id: UUID, version_data: VersionUpdate, db: Session = Depends(get_db)):
    """
    Update an existing Bible version by ID.
    """
    updated = version_service.update_version(db, version_id, version_data)
    return {
        "message": "Version updated successfully",
        "data": updated
    }

# 7. Delete version by ID
@router.delete(
    "/{version_id}",
    response_model=SuccessResponse,
    responses={404: {"model": ErrorResponse}},
    status_code=status.HTTP_200_OK,
    summary="Delete version by ID"
)
def delete_version_route(version_id: UUID, db: Session = Depends(get_db)):
    """
    Delete a Bible version using its ID.
    """
    deleted = version_service.delete_version(db, version_id)
    return {
        "message": f"Version with ID {version_id} deleted successfully.",
        "data": deleted
    }
