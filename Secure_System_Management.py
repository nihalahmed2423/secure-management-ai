
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
    