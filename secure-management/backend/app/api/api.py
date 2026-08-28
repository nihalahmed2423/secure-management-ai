from fastapi import APIRouter
from app.api.endpoints import predict

api_router = APIRouter()

api_router.include_router(predict.router, prefix="/predict", tags=["prediction"])
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# api_router.include_router(locations.router, prefix="/locations", tags=["locations"])
