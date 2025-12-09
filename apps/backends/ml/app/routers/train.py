# app/routers/train.py
from fastapi import APIRouter, BackgroundTasks
from app.services.data_loader import load_data_from_express
from app.recommender.lightfm_model import Trainer
from app.utils.logger import logger

router = APIRouter()

@router.post(
    "/",
    summary="Train the recommendation model",
    description="""
    Initiates model training in the background using the latest data from the backend API.
    
    This endpoint:
    1. Fetches items (places/events) and user interactions from the Express backend
    2. Trains a LightFM collaborative filtering model
    3. Computes content-based similarity matrices
    4. Saves the trained models to disk
    
    **Note:** Training runs asynchronously in the background. Use the `/debug/status` endpoint to check if the model is ready.
    
    **Returns:**
    - Status message indicating training has started
    """,
    response_description="Training status",
    tags=["Training"]
)
def train(background: BackgroundTasks):
    """
    Start training in background; returns immediately.
    """
    def _train_task():
        logger.info("Load data")
        items_df, interactions_df = load_data_from_express()
        trainer = Trainer()
        trainer.train(items_df, interactions_df)
        logger.info("Training finished.")

    background.add_task(_train_task)
    return {"status": "started", "message": "Model training initiated in background"}
