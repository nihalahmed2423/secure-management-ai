from app.database.session import SessionLocal, engine, Base
from app.models.location import Location
from app.models.emergency import Resource
from app.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(Location).first():
        print("Database already seeded.")
        return

    # Create Admin User
    admin = User(
        email="admin@secure.gov",
        hashed_password=pwd_context.hash("admin123"),
        role="ADMIN"
    )
    db.add(admin)

    # Create Locations
    locations = [
        Location(name="Velachery", state="Tamil Nadu", district="Chennai", latitude=12.9815, longitude=80.2180, population=150000, base_risk=60.0),
        Location(name="Tambaram", state="Tamil Nadu", district="Chennai", latitude=12.9249, longitude=80.1100, population=200000, base_risk=45.0),
        Location(name="Adyar", state="Tamil Nadu", district="Chennai", latitude=13.0012, longitude=80.2565, population=120000, base_risk=30.0)
    ]
    db.add_all(locations)
    db.commit()

    # Create Resources
    velachery = db.query(Location).filter(Location.name == "Velachery").first()
    resources = [
        Resource(type="Ambulance", current_location_id=velachery.id, status="AVAILABLE"),
        Resource(type="Rescue Team", current_location_id=velachery.id, status="AVAILABLE"),
        Resource(type="Generator", current_location_id=velachery.id, status="AVAILABLE")
    ]
    db.add_all(resources)
    db.commit()

    print("Successfully seeded database with Locations, Users, and Resources.")

if __name__ == "__main__":
    seed()
