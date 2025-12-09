# app/routers/health.py
from fastapi import APIRouter

router = APIRouter()

@router.get(
    "/",
    summary="Health check",
    description="""
    Simple health check endpoint to verify the ML service is running.
    
    **Returns:**
    - Service status and name
    """,
    response_description="Service health status",
    tags=["Health"]
)
def health():
    """Check if the ML service is alive and responding"""
    return {"status": "ok", "service": "ml-engine"}
