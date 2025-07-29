from sqlalchemy.orm import Session
from uuid import UUID
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.sources import Source
from app.models.languages import Language
from app.schemas.sources import SourceCreate, SourceUpdate

class SourceService:
    def create_source(self, db: Session, source: SourceCreate) -> Source:
        language = db.query(Language).filter(Language.id == source.language_id).first()
        if not language:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Language with ID {source.language_id} not found"
            )

        new_source = Source(**source.dict())
        try:
            db.add(new_source)
            db.commit()
            db.refresh(new_source)
            return new_source
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create source"
            )

    def get_source(self, db: Session, source_id: UUID) -> Source:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source with ID {source_id} not found"
            )
        return source

    def get_all_sources(self, db: Session):
        return db.query(Source).all()

    def update_source(self, db: Session, source_id: UUID, update: SourceUpdate) -> Source:
        source = self.get_source(db, source_id)

        if update.language_id:
            language = db.query(Language).filter(Language.id == update.language_id).first()
            if not language:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Language with ID {update.language_id} not found"
                )

        for field, value in update.dict(exclude_unset=True).items():
            setattr(source, field, value)

        try:
            db.commit()
            db.refresh(source)
            return source
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update source"
            )

    def delete_source(self, db: Session, source_id: UUID) -> Source:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source with ID {source_id} not found"
            )
        db.delete(source)
        db.commit()
        return source

source_service = SourceService()
