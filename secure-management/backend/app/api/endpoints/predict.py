from fastapi import APIRouter
from pydantic import BaseModel
from ml.predictor import predictor

router = APIRouter()

class PredictionRequest(BaseModel):
    rainfall: float
    water_level: float
    wind_speed: float
    road_blocks: int
    power_outage: int # 0 or 1

class PredictionResponse(BaseModel):
    risk_score: float
    confidence: float
    risk_level: str
    factors: dict

@router.post("/")
def get_prediction(req: PredictionRequest):
    score, confidence = predictor.predict(
        req.rainfall, req.water_level, req.wind_speed, req.road_blocks, req.power_outage
    )
    
    level = predictor.get_risk_level(score)
    
    # Calculate explainable factors based on simple rules to match model heuristics
    factors = {
        "Rainfall Contribution": round(req.rainfall * 0.3, 1),
        "Water Level Impact": round(req.water_level * 0.4, 1),
        "Road Blockages": req.road_blocks * 3,
        "Power Loss Penalty": req.power_outage * 5
    }
    
    return {
        "risk_score": round(score, 1),
        "confidence": round(confidence, 1),
        "risk_level": level,
        "factors": factors
    }
