# app/routers/recommend.py
from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.recommender.lightfm_model import LightFMRecommender
from app.recommender.similarity import ContentSimilarity

router = APIRouter()
_recommender = LightFMRecommender()
_sim = ContentSimilarity()

@router.get(
    "/user/{user_id}",
    summary="Get personalized recommendations for a user",
    description="""
    Returns personalized recommendations for a specific user based on their interaction history.
    
    The recommendations are generated using a collaborative filtering model (LightFM) trained on user-item interactions.
    
    **Parameters:**
    - **user_id**: The unique identifier of the user
    - **n**: Number of recommendations to return (default: 10)
    
    **Returns:**
    - List of recommended item IDs ranked by relevance
    """,
    response_description="User recommendations with item IDs",
    tags=["Recommendations"]
)
def recommend_user(
    user_id: str,
    n: int = Query(default=10, ge=1, le=100, description="Number of recommendations")
):
    """Get personalized recommendations for a user"""
    recs = _recommender.recommend_for_user(user_id, n)
    if recs is None:
        raise HTTPException(status_code=404, detail="Model not trained or user not found")
    return {"userId": user_id, "recommendations": recs}

@router.get(
    "/item/{item_id}",
    summary="Find similar items",
    description="""
    Returns items similar to the specified item based on content features.
    
    Uses content-based similarity (cosine similarity on item features) to find related places or events.
    
    **Parameters:**
    - **item_id**: The unique identifier of the item (place or event)
    - **n**: Number of similar items to return (default: 8)
    
    **Returns:**
    - List of similar item IDs ranked by similarity score
    """,
    response_description="Similar items with IDs",
    tags=["Recommendations"]
)
def similar_item(
    item_id: str,
    n: int = Query(default=8, ge=1, le=50, description="Number of similar items")
):
    """Find items similar to the given item"""
    recs = _sim.most_similar(item_id, topn=n)
    if recs is None:
        raise HTTPException(status_code=404, detail="No similarity data available")
    return {"itemId": item_id, "similar": recs}

