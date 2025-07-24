try:
    from pydantic import BaseModel, ConfigDict  # Pydantic v2
    class MyBaseModel(BaseModel):
        model_config = ConfigDict(from_attributes=True)

except ImportError:
    from pydantic import BaseModel  # Pydantic v1
    class MyBaseModel(BaseModel):
        class Config:
            orm_mode = True
