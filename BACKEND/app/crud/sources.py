from sqlalchemy.orm import Session
from app.models.sources import Source
from app.models.languages import Language
from app.schemas.sources import SourceCreate, SourceUpdate
from fastapi import HTTPException, status
from uuid import UUID

class SourceService:
    def create_source(self, db: Session, source_data: SourceCreate) -> Source:
        language = db.query(Language).filter(Language.id == source_data.language_id).first()
        if not language:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Language with ID {source_data.language_id} not found"
            )

        source = Source(
            version_name=source_data.version_name,
            version_abbreviation=source_data.version_abbreviation,
            language_id=source_data.language_id,
            language_name=language.name,  # auto-fill
            description=source_data.description
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        return source

    def get_source(self, db: Session, source_id: UUID) -> Source:
        source = db.query(Source).filter(Source.source_id == source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        return source

    def get_all_sources(self, db: Session) -> list[Source]:
        return db.query(Source).all()

    def update_source(self, db: Session, source_id: UUID, update: SourceUpdate) -> Source:
        source = db.query(Source).filter(Source.source_id == source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        if update.language_id:
            language = db.query(Language).filter(Language.id == update.language_id).first()
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
