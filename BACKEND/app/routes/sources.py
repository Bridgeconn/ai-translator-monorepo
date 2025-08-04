from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database import get_db
from app.schemas.sources import (
    SourceCreate, SourceUpdate, SourceResponse,
    SuccessResponse,SuccessListResponse, ErrorResponse
)
from app.crud.sources import source_service

router = APIRouter(tags=["sources"])

@router.post(
    "/",
    response_model=SuccessResponse,
    responses={409: {"model": ErrorResponse}},
    status_code=status.HTTP_201_CREATED,
    summary="Create a new source"
)
def create_source(source: SourceCreate, db: Session = Depends(get_db)):
    created = source_service.create_source(db, source)
    return {
        "message": "Source created successfully.",
        "data": created
    }

@router.get(
    "/{source_id}",
    response_model=SuccessResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Fetch a source by ID"
)
def read_source(source_id: UUID, db: Session = Depends(get_db)):
    source = source_service.get_source(db, source_id)
    return {
        "message": "Source fetched successfully.",
        "data": source
    }

@router.get(
    "/",
    response_model=SuccessListResponse,
    summary="Fetch all sources"
)
def read_sources(db: Session = Depends(get_db)):
    sources = source_service.get_all_sources(db)
    source_responses = [SourceResponse.from_orm(src) for src in sources]
    msg = "Sources fetched successfully." if sources else "No sources found."
    return {
        "message": msg,
        "data": source_responses
    }
@router.get(
    "/by_version_name/{version_name}",
    response_model=SuccessListResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Fetch all sources by version name"
)
def get_sources_by_version_name(version_name: str, db: Session = Depends(get_db)):
    sources = source_service.get_sources_by_version_name(db, version_name)
    if not sources:
        return {
            "message": f"No sources found for version_name '{version_name}'.",
            "data": []
        }
    source_responses = [SourceResponse.from_orm(src) for src in sources]
    return {
        "message": "Sources fetched successfully.",
        "data": source_responses
    }



@router.put(
    "/{source_id}",
    response_model=SuccessResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Update a source by ID"
)
def update_source(source_id: UUID, update: SourceUpdate, db: Session = Depends(get_db)):
    updated = source_service.update_source(db, source_id, update)
    return {
        "message": "Source updated successfully.",
        "data": updated
    }

@router.delete(
    "/{source_id}",
    response_model=SuccessResponse,
    responses={404: {"model": ErrorResponse}},
    status_code=status.HTTP_200_OK,
    summary="Delete a source by ID"
)
def delete_source(source_id: UUID, db: Session = Depends(get_db)):
    deleted = source_service.delete_source(db, source_id)
    return {
        "message": f"Source with ID {source_id} deleted successfully.",
        "data": deleted
    }