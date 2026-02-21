import joblib
import numpy as np
import os
from typing import List, Optional

MODEL_PATH = os.path.join(os.path.dirname(__file__), "risk_model.pkl")
RISK_LABELS = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
_model = None

def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError("Model not found. Run: python app/ml/train.py")
        _model = joblib.load(MODEL_PATH)
    return _model

def predict_risk(gpa, attendance, marks=None):
    model = get_model()

    avg_internal = 25.0
    upc_days = 0.0
    has_upc = 0

    if marks:
        internals = [m.get("avgInternal", 25.0) for m in marks]
        avg_internal = float(np.mean(internals))
        upc_marks = [m for m in marks if m.get("hasUPC", False)]
        if upc_marks:
            has_upc = 1
            upc_days = float(np.mean([m.get("upc_days", 0) or 0 for m in upc_marks]))

    features = np.array([[gpa, attendance, avg_internal, upc_days, has_upc]])
    prediction = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]
    confidence = float(np.max(probabilities) * 100)
    risk_level = RISK_LABELS[prediction]
    risk_score = round(
        probabilities[0] * 10 + probabilities[1] * 55 + probabilities[2] * 95, 1
    )

    factors = {}
    if gpa < 4: factors["gpa"] = "Very low GPA (< 4.0)"
    elif gpa < 6: factors["gpa"] = "Below average GPA (< 6.0)"
    else: factors["gpa"] = "Satisfactory GPA"

    if attendance < 50: factors["attendance"] = "Critical attendance (< 50%)"
    elif attendance < 75: factors["attendance"] = "Low attendance (< 75%)"
    else: factors["attendance"] = "Good attendance"

    avg_pct = (avg_internal / 50) * 100
    if avg_pct < 40: factors["marks"] = "Very low internal marks (< 40%)"
    elif avg_pct < 60: factors["marks"] = "Below average marks (< 60%)"
    else: factors["marks"] = "Satisfactory marks"

    if has_upc:
        upc_pct = (upc_days / 10) * 100
        if upc_pct < 50: factors["upc"] = "High UPC days missed"
        else: factors["upc"] = "Moderate UPC attendance"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "confidence": round(confidence, 1),
        "factors": factors,
    }