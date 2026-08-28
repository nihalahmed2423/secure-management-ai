from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.api import api_router
from pathlib import Path

app = FastAPI(
    title="SECURE MANAGEMENT API",
    description="AI-Powered Disaster Risk Prediction & Emergency Response System",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

# Serve the vanilla JS frontend
frontend_path = Path(__file__).parent.parent.parent / "frontend"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")

@app.get("/api/system/health")
def health_check():
    return {
        "status": "ok",
        "services": {
            "backend": "ok",
            "database": "ok", 
            "ml_model": "ok",
            "map_service": "ok"
        }
    }
