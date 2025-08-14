from sqlalchemy.orm import Session
from app.models.sources import Source
from app.models.languages import Language
from app.models.versions import Version
from app.schemas.sources import SourceCreate, SourceUpdate
from fastapi import HTTPException, status
from uuid import UUID

class SourceService:
    def create_source(self, db: Session, source_data: SourceCreate) -> Source:
        existing_source = db.query(Source).filter(
            Source.language_id == source_data.language_id,
            Source.version_id == source_data.version_id
        ).first()
        if existing_source:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source with the given language and version already exists"
            )

    # Fetch language
        language = db.query(Language).filter(Language.language_id == source_data.language_id).first()
        if not language:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Language with ID {source_data.language_id} not found"
            )

    # Fetch version
        version = db.query(Version).filter(Version.version_id == source_data.version_id).first()
        if not version:
            raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version with ID {source_data.version_id} not found"
        )

    # Create Source with auto-filled names
        source = Source(
        language_id=source_data.language_id,
        language_name=language.name,
        version_id=source_data.version_id,
        version_name=version.version_name,
        description=source_data.description,
    )

        db.add(source)
        db.commit()
        db.refresh(source)
        return source

    def get_source_by_id(self, db: Session, source_id: UUID) -> Source:
        source = db.query(Source).filter(Source.source_id == source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        return source

    def get_all_sources(self, db: Session) -> list[Source]:
        return db.query(Source).all()

    def get_sources_by_version_name(self, db: Session, version_name: str) -> list[Source]:
        return db.query(Source).filter(Source.version_name == version_name).all()

    def update_source(self, db: Session, source_id: UUID, update: SourceUpdate) -> Source:
        source = db.query(Source).filter(Source.source_id == source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        if update.language_id:
            language = db.query(Language).filter(Language.language_id == update.language_id).first()
            if not language:
                raise HTTPException(status_code=404, detail="Language not found")
            source.language_id = update.language_id
            source.language_name = language.name  # update name too

        if update.version_name:
            source.version_name = update.version_name
        if update.version_abbreviation:
            source.version_abbreviation = update.version_abbreviation
        if update.description is not None:
            source.description = update.description

        db.commit()
        db.refresh(source)
        return source

    def delete_source(self, db: Session, source_id: UUID) -> Source:
        source = db.query(Source).filter(Source.source_id == source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        db.delete(source)
        db.commit()
        return source

source_service = SourceService()