# app/main.py
from fastapi import FastAPI
from app.routers import health, train, recommend, debug
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from dotenv import load_dotenv
load_dotenv() 

app = FastAPI(
    title="Adama Tourism ML Recommendation Engine",
    version="1.0.0",
    description="""
    ## Machine Learning Recommendation API
    
    This API provides intelligent recommendations for tourism in Adama City using collaborative filtering and content-based similarity.
    
    ### Features:
    * **User-based Recommendations**: Get personalized recommendations based on user behavior
    * **Item Similarity**: Find similar places and events
    * **Model Training**: Train the recommendation model with latest data
    * **Health Monitoring**: Check service status and model readiness
    
    ### Authentication:
    Some endpoints may require API key authentication (x-api-key header).
    """,
    contact={
        "name": "Adama Tourism API Support",
        "email": "support@adamatourism.com"
    },
    license_info={
        "name": "MIT"
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(train.router, prefix="/train", tags=["training"])
app.include_router(recommend.router, prefix="/recommend", tags=["recommend"])
app.include_router(debug.router, prefix="/debug", tags=["debug"])

# Add an API key security scheme to the generated OpenAPI so Swagger UI
# shows an "Authorize" button for x-api-key.
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema.setdefault("components", {}).setdefault("securitySchemes", {})
    openapi_schema["components"]["securitySchemes"]["ApiKeyAuth"] = {
        "type": "apiKey",
        "in": "header",
        "name": "x-api-key",
        "description": "Enter the ML API key (x-api-key header) shared with the backend.",
    }
    # Set as global security requirement so the Authorize button appears.
    openapi_schema["security"] = [{"ApiKeyAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
