class LanguageResponse(BaseModel):
    id: UUID
    name: str
    code: str
    created_at: datetime

    class Config:
        orm_mode = True