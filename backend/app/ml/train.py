import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "risk_model.pkl")

def generate_training_data(n=2000):
    np.random.seed(42)
    gpa = np.random.uniform(2.0, 10.0, n)
    attendance = np.random.randint(20, 100, n)
    avg_internal = np.random.uniform(5.0, 50.0, n)
    upc_days = np.random.randint(0, 10, n)
    has_upc = np.random.choice([0, 1], n, p=[0.4, 0.6])
    risk = []
    for i in range(n):
        score = 0
        if gpa[i] < 4: score += 40
        elif gpa[i] < 6: score += 20
        if attendance[i] < 50: score += 40
        elif attendance[i] < 75: score += 20
        pct = (avg_internal[i] / 50) * 100
        if pct < 40: score += 30
        elif pct < 60: score += 15
        if has_upc[i]:
            upc_pct = (upc_days[i] / 10) * 100
            if upc_pct < 50: score += 20
            elif upc_pct < 70: score += 10
        if score >= 70: risk.append(2)
        elif score >= 40: risk.append(1)
        else: risk.append(0)
    return pd.DataFrame({
        "gpa": gpa, "attendance": attendance,
        "avg_internal": avg_internal,
        "upc_days": upc_days * has_upc,
        "has_upc": has_upc, "risk": risk
    })

def train():
    print("Generating training data...")
    df = generate_training_data(2000)
    print(f"Distribution:\n{df['risk'].value_counts()}")
    X = df[["gpa", "attendance", "avg_internal", "upc_days", "has_upc"]]
    y = df["risk"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    model = RandomForestClassifier(
        n_estimators=100, max_depth=10,
        random_state=42, class_weight="balanced"
    )
    model.fit(X_train, y_train)
    print("\nPerformance:")
    print(classification_report(model.predict(X_test), y_test,
                                target_names=["Low", "Medium", "High"]))
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train()