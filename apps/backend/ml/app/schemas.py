from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class RecommendationResponse(BaseModel):
    userId: str = Field(..., example="user-123")
    recommendations: List[str] = Field(..., example=["place-1", "event-2"])

class SimilarItemResponse(BaseModel):
    itemId: str = Field(..., example="place-1")
    similar: List[str] = Field(..., example=["place-5", "place-9"])

class TrainResponse(BaseModel):
    status: str = Field(..., example="started")

class HealthResponse(BaseModel):
    status: str = Field(..., example="ok")
    service: str = Field(..., example="ml-engine")

class DebugStatusResponse(BaseModel):
    lightfm_loaded: bool = Field(..., example=True)
    similarity_ready: bool = Field(..., example=True)

class DebugDataSampleResponse(BaseModel):
    items_count: int = Field(..., example=100)
    interactions_count: int = Field(..., example=500)
    items_head: List[Dict[str, Any]]
    interactions_head: List[Dict[str, Any]]
