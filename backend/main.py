import random
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import sqlite3

app = FastAPI()

def init_db():
    conn = sqlite3.connect("rescue_teams.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password TEXT, phone TEXT)''')
    conn.commit()
    conn.close()

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionRequest(BaseModel):
    state: str
    pincode: str

# Global variable to hold our trained Machine Learning Model
disaster_ml_model = None

def train_machine_learning_model():
    """
    Trains a real Random Forest Regressor using synthetic 
    disaster metrics (NDMA / Bhuvan mappings) at startup.
    """
    global disaster_ml_model
    print("Training Machine Learning Model (RandomForestRegressor)...")
    
    # 1. Generate Synthetic Training Data
    np.random.seed(42)
    n_samples = 1500
    
    # Random pincode prefixes (first 2 digits)
    prefixes = np.random.randint(10, 99, n_samples)
    
    # Features: Prefix, Avg_Rainfall(mm), Elevation(m), River_Proximity(km)
    data = []
    for prefix in prefixes:
        # High risk coastal / flood zones based on user prompt datasets
        if prefix in [78, 80, 81, 82, 84, 75, 70, 53, 60, 40, 71]:
            rain = np.random.uniform(150, 500)
            elevation = np.random.uniform(1, 40)
            river_dist = np.random.uniform(0.1, 4.0)
            # High risk formula
            risk_score = min(99.0, (rain * 0.25) - (elevation * 0.3) - (river_dist * 2) + 50)
        else:
            rain = np.random.uniform(10, 120)
            elevation = np.random.uniform(100, 2000)
            river_dist = np.random.uniform(10.0, 150.0)
            # Low risk formula
            risk_score = max(5.0, (rain * 0.1) - (elevation * 0.01) - (river_dist * 0.05) + 15)
            
        data.append([prefix, rain, elevation, river_dist, risk_score])
        
    df = pd.DataFrame(data, columns=['Pincode_Prefix', 'Rainfall', 'Elevation', 'River_Distance', 'Risk_Score'])
    
    # 2. Train the Regression Model
    X = df[['Pincode_Prefix', 'Rainfall', 'Elevation', 'River_Distance']]
    y = df['Risk_Score']
    
    disaster_ml_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    disaster_ml_model.fit(X, y)
    print("Machine Learning Model Training Complete and Loaded into Memory.")

@app.on_event("startup")
def startup_event():
    train_machine_learning_model()

def generate_risk(pincode: str):
    global disaster_ml_model
    
    # Feature Engineering on the incoming pincode
    try:
        prefix = int(pincode[:2])
    except:
        prefix = 40 # default
        
    # Simulate real-time weather features for this specific pincode
    # Seeded by pincode so the demo stays consistent for the same location
    np.random.seed(int(pincode) if pincode.isdigit() else 42) 
    
    if prefix in [78, 80, 81, 82, 84, 75, 70, 53, 60, 40, 71]:
        rain = np.random.uniform(150, 500)
        elevation = np.random.uniform(1, 40)
        river_dist = np.random.uniform(0.1, 4.0)
    else:
        rain = np.random.uniform(10, 120)
        elevation = np.random.uniform(100, 2000)
        river_dist = np.random.uniform(10.0, 150.0)
        
    # Create input feature vector
    X_input = pd.DataFrame([[prefix, rain, elevation, river_dist]], 
                           columns=['Pincode_Prefix', 'Rainfall', 'Elevation', 'River_Distance'])
                           
    # Use the Scikit-Learn Random Forest model to predict
    prediction = disaster_ml_model.predict(X_input)[0]
    
    return round(float(prediction), 2)

import json
import requests

class PredictionRequest(BaseModel):
    state: str
    pincode: str
    lat: float = 0.0
    lon: float = 0.0

def fetch_real_hospitals_dataset(pincode: str, lat: float, lon: float):
    # Simulated connection to a local dataset, backed by real-time Overpass API
    dataset_path = os.path.join(os.path.dirname(__file__), "hospitals_dataset.json")
    
    # Check cache first to act like a static dataset
    if os.path.exists(dataset_path):
        with open(dataset_path, "r") as f:
            try:
                db = json.load(f)
                if pincode in db:
                    return db[pincode]
            except:
                db = {}
    else:
        db = {}
        
    # If not in our "dataset", fetch real ones and add to our dataset database
    if lat == 0.0 or lon == 0.0:
        return []
        
    overpass_url = "https://overpass-api.de/api/interpreter"
    query = f"""
    [out:json];
    (
      node["amenity"="hospital"](around:25000,{lat},{lon});
      way["amenity"="hospital"](around:25000,{lat},{lon});
      relation["amenity"="hospital"](around:25000,{lat},{lon});
    );
    out center 5;
    """
    
    try:
        response = requests.post(overpass_url, data={'data': query}, timeout=10)
        data = response.json()
        
        hospitals = []
        if "elements" in data:
            for el in data["elements"]:
                name = el.get("tags", {}).get("name", "General Medical Facility")
                is_emergency = el.get("tags", {}).get("emergency", "no") == "yes"
                h_lat = el.get("lat", el.get("center", {}).get("lat", lat))
                h_lon = el.get("lon", el.get("center", {}).get("lon", lon))
                phone = el.get("tags", {}).get("phone", "+91 9800000000")
                
                hospitals.append({
                    "name": name,
                    "type": "Emergency Ward" if is_emergency else "Standard Hospital",
                    "phone": phone,
                    "lat": h_lat,
                    "lon": h_lon
                })
                
        # Cache to our local dataset database
        db[pincode] = hospitals
        with open(dataset_path, "w") as f:
            json.dump(db, f)
            
        return hospitals
    except Exception as e:
        print("Dataset fetch error:", e)
        return []

@app.post("/api/predict")
def predict_risk(request: PredictionRequest):
    risk_percentage = generate_risk(request.pincode)
    
    if risk_percentage > 85:
        alert = "HIGH RISK ALERT"
    elif risk_percentage > 65:
        alert = "MODERATE RISK ALERT"
    elif risk_percentage > 35:
        alert = "LESS RISK ALERT"
    else:
        alert = "NO RISK"
        
    return {
        "state": request.state,
        "risk_percentage": risk_percentage,
        "alert": alert,
        "priorities": get_priorities(alert)
    }

def get_priorities(alert: str):
    if alert == "HIGH RISK ALERT":
        return [
            {"level": "Critical", "resource": "Ambulance"},
            {"level": "Critical", "resource": "Rescue Team"},
            {"level": "High", "resource": "Generator"}
        ]
    elif alert == "MODERATE RISK ALERT":
        return [
            {"level": "High", "resource": "Generator"},
            {"level": "Medium", "resource": "Traffic Support"}
        ]
    elif alert == "LESS RISK ALERT":
        return [
            {"level": "Medium", "resource": "Traffic Support"}
        ]
    else:
        return []

class LoginRequest(BaseModel):
    email: str
    password: str
    phone: str

@app.post("/api/login")
def login_rescue_member(req: LoginRequest):
    try:
        conn = sqlite3.connect("rescue_teams.db")
        c = conn.cursor()
        c.execute("INSERT INTO users (email, password, phone) VALUES (?, ?, ?)", (req.email, req.password, req.phone))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Login saved to database."}
    except Exception as e:
        print("DB Error:", e)
        return {"status": "error"}

# Serve static files
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
os.makedirs(frontend_dir, exist_ok=True)
app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")

@app.get("/")
def read_root():
    return FileResponse(os.path.join(frontend_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
