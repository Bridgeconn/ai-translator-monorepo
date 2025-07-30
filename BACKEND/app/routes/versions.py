from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, status
from uuid import UUID

from app.database import get_db
from app.schemas.versions import VersionCreate, VersionUpdate, VersionOut, SuccessResponse, ErrorResponse
from app.crud.versions import version_service
from typing import Optional, List
from fastapi import Query

router = APIRouter()

@router.get(
    "/",
    response_model=SuccessResponse,
    summary="List all Bible versions"
)
def list_all_versions(
    version_name: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get all Bible versions with optional filtering by name and active status.
    """
    versions = version_service.get_all_versions(db, version_name, is_active)
    return {
        "message": "Filtered versions list fetched successfully",
        "data": versions
    }

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

@router.get(
    "/",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="List all Bible versions"
)
def list_all_versions(db: Session = Depends(get_db)):
    """
    Get a list of all available Bible versions.
    """
    versions = version_service.get_all_versions(db)
    return {
        "message": "List of versions fetched successfully",
        "data": versions
    }

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
