# app/routers/debug.py
from fastapi import APIRouter
from app.recommender.lightfm_model import LightFMRecommender
from app.recommender.similarity import ContentSimilarity
from app.services.data_loader import load_data_from_express

router = APIRouter()

@router.get(
    "/status",
    summary="Check model status",
    description="""
    Returns the current status of the recommendation models.
    
    **Returns:**
    - **lightfm_loaded**: Whether the collaborative filtering model is loaded and ready
    - **similarity_ready**: Whether the content similarity model is ready
    
    Use this endpoint to verify that models are trained and available before making recommendation requests.
    """,
    response_description="Model readiness status",
    tags=["Debug"]
)
def status():
    """Check if recommendation models are loaded and ready"""
    rec = LightFMRecommender()
    sim = ContentSimilarity()
    return {
        "lightfm_loaded": rec.is_ready(),
        "similarity_ready": sim.is_ready()
    }

@router.get(
    "/data_sample",
    summary="Get data sample",
    description="""
    Fetches and returns a sample of the training data from the backend API.
    
    This endpoint is useful for:
    - Verifying data connectivity with the Express backend
    - Inspecting data format and quality
    - Debugging data loading issues
    
    **Returns:**
    - Count of items and interactions
    - Sample records from both datasets (first 5 rows)
    """,
    response_description="Sample data from backend",
    tags=["Debug"]
)
def data_sample():
    """Fetch and display sample data from the backend API"""
    items, interactions = load_data_from_express()
    return {
        "items_count": len(items),
        "interactions_count": len(interactions),
        "items_head": items.head(5).to_dict(orient="records"),
        "interactions_head": interactions.head(5).to_dict(orient="records")
    }
