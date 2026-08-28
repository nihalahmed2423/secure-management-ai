from sqlalchemy import Column, Integer, String, Boolean
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="CITIZEN") # ADMIN, DISASTER_MANAGEMENT, RESPONSE_TEAM, CITIZEN
    is_active = Column(Boolean, default=True)
