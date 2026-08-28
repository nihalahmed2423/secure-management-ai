import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import pickle
import os

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)
    # Features: rainfall (mm), water_level (cm), wind_speed (km/h), road_blocks, power_outage (0/1)
    rainfall = np.random.uniform(0, 200, num_samples)
    water_level = rainfall * 0.5 + np.random.normal(0, 10, num_samples)
    water_level = np.clip(water_level, 0, None)
    wind_speed = np.random.uniform(0, 100, num_samples)
    road_blocks = np.random.randint(0, 10, num_samples)
    power_outage = np.random.randint(0, 2, num_samples)
    
    # Calculate a risk score (0-100)
    risk_score = (rainfall * 0.3 + water_level * 0.4 + wind_speed * 0.1 + road_blocks * 3 + power_outage * 5)
    risk_score = np.clip(risk_score, 0, 100)
    
    df = pd.DataFrame({
        'rainfall': rainfall,
        'water_level': water_level,
        'wind_speed': wind_speed,
        'road_blocks': road_blocks,
        'power_outage': power_outage,
        'risk_score': risk_score
    })
    return df

def train_and_save_model():
    print("Generating synthetic data...")
    df = generate_synthetic_data(2000)
    
    X = df[['rainfall', 'water_level', 'wind_speed', 'road_blocks', 'power_outage']]
    y = df['risk_score']
    
    print("Training Random Forest model...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Calculate a dummy "confidence" (could just be 1 - variance of trees, but for demo we mock)
    # The actual output will just use the model prediction and we calculate confidence on the fly
    
    # Save the model
    os.makedirs(os.path.dirname(__file__), exist_ok=True)
    model_path = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_and_save_model()
