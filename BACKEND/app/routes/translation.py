from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.translation import SuccessDraftResponse, GenerateDraftRequest
from app.crud.translation import translation_service

router = APIRouter(prefix="/translation")

@router.post("/generate", response_model=SuccessDraftResponse, status_code=status.HTTP_201_CREATED)
def generate_draft(req: GenerateDraftRequest, db: Session = Depends(get_db)):
    draft = translation_service.generate_draft(db, req.project_id)
    return {"message": "Draft generated successfully", "data": draft}
