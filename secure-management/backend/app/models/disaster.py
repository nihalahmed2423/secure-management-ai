from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database.session import Base

class WeatherData(Base):
    __tablename__ = "weather_data"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    rainfall = Column(Float)
    water_level = Column(Float)
    wind_speed = Column(Float)
    road_blockages = Column(Integer, default=0)
    power_status = Column(String, default="NORMAL") # NORMAL, FLUCTUATING, OUTAGE

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    risk_score = Column(Float) # 0 to 100
    confidence = Column(Float) # 0 to 100
    risk_level = Column(String) # NO RISK, LESS RISK, MODERATE RISK, HIGH RISK, CRITICAL
    factors = Column(JSON) # e.g. {"Heavy Rainfall": 25, "Rapid Water Increase": 22}
    predicted_future_levels = Column(JSON) # e.g. {"+30m": 50, "+60m": 70}
