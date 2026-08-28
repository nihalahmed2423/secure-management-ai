import pickle
import os
import numpy as np

class RiskPredictor:
    def __init__(self):
        self.model = None
        self.model_path = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')
        self._load_model()
        
    def _load_model(self):
        if os.path.exists(self.model_path):
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
                
    def predict(self, rainfall, water_level, wind_speed, road_blocks, power_outage):
        if not self.model:
            # Fallback mock prediction if model missing
            score = (rainfall * 0.3) + (water_level * 0.4)
            return min(score, 100.0), 80.0
            
        features = np.array([[rainfall, water_level, wind_speed, road_blocks, power_outage]])
        
        # Get prediction from all trees to estimate confidence
        predictions = []
        for estimator in self.model.estimators_:
            predictions.append(estimator.predict(features)[0])
            
        mean_prediction = np.mean(predictions)
        std_prediction = np.std(predictions)
        
        # Calculate confidence inversely proportional to standard deviation
        # If all trees agree, std is low -> confidence is high
        confidence = 100 - min(std_prediction * 2, 50)
        
        return min(mean_prediction, 100.0), max(confidence, 50.0)

    def get_risk_level(self, score):
        if score > 85:
            return "CRITICAL RISK"
        elif score > 65:
            return "HIGH RISK"
        elif score > 35:
            return "MODERATE RISK"
        else:
            return "LOW RISK"

predictor = RiskPredictor()
