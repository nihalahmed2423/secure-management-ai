from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.database.session import Base

class EmergencyRequest(Base):
    __tablename__ = "emergency_requests"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), index=True)
    type = Column(String) # Flood Rescue, Medical, Evacuation
    severity = Column(String) # LOW, MEDIUM, HIGH, CRITICAL
    people_affected = Column(Integer)
    vulnerable_people = Column(Integer, default=0)
    priority_score = Column(Float, default=0.0) # Calculated by Priority Engine
    priority_level = Column(String) # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String, default="PENDING") # PENDING, ASSIGNED, RESOLVED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String) # Ambulance, Rescue Team, Generator, Medical Unit
    current_location_id = Column(Integer, ForeignKey("locations.id"))
    status = Column(String, default="AVAILABLE") # AVAILABLE, DEPLOYED, BUSY, OFFLINE

class ResourceAssignment(Base):
    __tablename__ = "resource_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    emergency_id = Column(Integer, ForeignKey("emergency_requests.id"))
    resource_id = Column(Integer, ForeignKey("resources.id"))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="EN_ROUTE") # EN_ROUTE, ON_SITE, COMPLETED
