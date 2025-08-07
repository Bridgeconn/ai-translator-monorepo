from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from fastapi import HTTPException, status
from app.models.versions import Version
from app.schemas.versions import VersionCreate, VersionUpdate
from typing import Optional

class VersionService:
    def get_version_by_id(self, db: Session, version_id: UUID) -> Version:
        version = db.query(Version).filter(Version.version_id == version_id).first()
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version with ID {version_id} not found"
            )
        return version

    def get_all_versions(self, db: Session, version_name: Optional[str] = None, is_active: Optional[bool] = None):
        query = db.query(Version)

        if version_name is not None:
           query = query.filter(Version.version_name.ilike(f"%{version_name}%"))
        if is_active is not None:
           query = query.filter(Version.is_active == is_active)

        return query.all()


    def create_version(self, db: Session, version: VersionCreate) -> Version:
        existing = db.query(Version).filter(Version.version_abbr == version.version_abbr).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Version abbreviation already exists"
            )
        
        new_version = Version(
            version_name=version.version_name,
            version_abbr=version.version_abbr,
            is_active=True
        )

        try:
            db.add(new_version)
            db.commit()
            db.refresh(new_version)
            return new_version
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create version"
            )

    # Add this inside the VersionService class

    def get_by_version_name(self, db: Session, version_name: str) -> Version:
        version = db.query(Version).filter(Version.version_name == version_name).first()
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version with name '{version_name}' not found"
            )
        return version

    def get_by_version_abbr(self, db: Session, version_abbr: str) -> Version:
        version = db.query(Version).filter(Version.version_abbr == version_abbr).first()
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version with abbreviation '{version_abbr}' not found"
            )
        return version
        

    def update_version(self, db: Session, version_id: UUID, version_data: VersionUpdate) -> Version:
        version = self.get_version_by_id(db, version_id)
        
        version.version_name = version_data.version_name or version.version_name
        version.version_abbr = version_data.version_abbr or version.version_abbr
        version.is_active = version_data.is_active if version_data.is_active is not None else version.is_active
        
        db.commit()
        db.refresh(version)
        return version

    def delete_version(self, db: Session, version_id: UUID) -> Version:
        version = self.get_version_by_id(db, version_id)

        version.is_active = False

        db.commit()
        db.refresh(version)
        return version


version_service = VersionService()
