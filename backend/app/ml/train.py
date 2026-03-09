"""
LearnPulse - Risk Model Training
=================================
Dataset: Synthetically generated but statistically grounded in real
academic research patterns (not rule-derived labels).

Key difference from old approach:
- Labels are derived from a COMPOSITE weighted formula (not the same
  if/else thresholds used in prediction)
- Added noise, interaction effects, and edge cases
- Proper train/val/test split with cross-validation
- Feature importance analysis
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "risk_model.pkl")
np.random.seed(2024)

# ─────────────────────────────────────────────────────────────────
# DATASET GENERATION
# Based on patterns from academic literature:
# - Tinto's model of student departure
# - Astin's I-E-O model
# - Published retention studies
# ─────────────────────────────────────────────────────────────────

def generate_realistic_data(n=5000):
    """
    Generate realistic student data with:
    - Correlated features (real students show correlations)
    - Natural noise and exceptions
    - Labels derived from weighted composite, NOT from threshold rules
    """

    # ── GPA (0-10 scale, Indian university style) ──────────────────
    # Bimodal: most students cluster around 5-8, some fail
    gpa_main = np.random.normal(6.5, 1.8, n)
    gpa_low  = np.random.normal(3.5, 0.8, int(n * 0.15))
    gpa = np.concatenate([gpa_main[:int(n*0.85)], gpa_low])
    gpa = np.clip(gpa, 2.0, 10.0)
    np.random.shuffle(gpa)

    # ── Attendance (correlated with GPA — real pattern) ────────────
    # Students with low GPA tend to have low attendance
    attendance_base = 40 + (gpa / 10.0) * 55 + np.random.normal(0, 12, n)
    attendance = np.clip(attendance_base, 20, 100).astype(int)

    # ── Internal Marks (0-50, correlated with GPA but not perfectly) ─
    marks_base = (gpa / 10.0) * 45 + np.random.normal(0, 6, n)
    avg_internal = np.clip(marks_base, 3.0, 50.0)

    # ── UPC (Arrear/backlog) data ──────────────────────────────────
    # Students with low marks more likely to have UPC
    upc_prob = np.where(avg_internal < 20, 0.75,
               np.where(avg_internal < 30, 0.45, 0.15))
    has_upc = np.array([np.random.binomial(1, p) for p in upc_prob])
    upc_days_raw = np.random.randint(0, 10, n)
    upc_days = upc_days_raw * has_upc

    # ── Derived features ───────────────────────────────────────────
    marks_pct    = (avg_internal / 50.0) * 100
    gpa_norm     = gpa / 10.0
    attend_norm  = attendance / 100.0

    # ── LABEL GENERATION ───────────────────────────────────────────
    # Uses a CONTINUOUS weighted risk formula — completely different
    # from the threshold-based predict.py logic to avoid data leakage.
    #
    # Weights based on academic retention literature:
    #   Academic performance (marks+gpa): ~55% of dropout risk
    #   Engagement (attendance):          ~30% of dropout risk
    #   Support needs (UPC):              ~15% of dropout risk

    risk_continuous = (
        0.35 * (1 - gpa_norm) +           # GPA contribution
        0.20 * (1 - marks_pct / 100) +    # Marks contribution
        0.30 * (1 - attend_norm) +         # Attendance contribution
        0.10 * has_upc * (1 - upc_days / 10.0) +  # UPC contribution
        0.05 * np.random.normal(0, 0.1, n) # Real-world noise
    )
    risk_continuous = np.clip(risk_continuous, 0, 1)

    # Map to 3 classes with realistic distribution
    # (approx 50% LOW, 30% MEDIUM, 20% HIGH — based on typical cohort)
    labels = np.where(risk_continuous >= 0.55, 2,      # HIGH
             np.where(risk_continuous >= 0.30, 1, 0))  # MEDIUM / LOW

    df = pd.DataFrame({
        "gpa":          gpa,
        "attendance":   attendance,
        "avg_internal": avg_internal,
        "upc_days":     upc_days,
        "has_upc":      has_upc,
        "risk":         labels
    })

    return df


# ─────────────────────────────────────────────────────────────────
# TRAINING
# ─────────────────────────────────────────────────────────────────

def train():
    print("=" * 60)
    print("LearnPulse — Risk Model Training")
    print("=" * 60)

    print("\n[1/5] Generating realistic dataset (n=5000)...")
    df = generate_realistic_data(5000)

    print(f"\nDataset shape: {df.shape}")
    print(f"\nClass distribution:")
    dist = df['risk'].value_counts().sort_index()
    labels_map = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
    for k, v in dist.items():
        print(f"  {labels_map[k]:8s}: {v:5d} ({v/len(df)*100:.1f}%)")

    print(f"\nFeature stats:")
    print(df[["gpa", "attendance", "avg_internal", "upc_days"]].describe().round(2))

    # ── Train / Validation / Test split (60 / 20 / 20) ────────────
    X = df[["gpa", "attendance", "avg_internal", "upc_days", "has_upc"]]
    y = df["risk"]

    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=0.25, random_state=42, stratify=y_temp
    )

    print(f"\n[2/5] Data split:")
    print(f"  Train : {len(X_train)} samples")
    print(f"  Val   : {len(X_val)} samples")
    print(f"  Test  : {len(X_test)} samples")

    # ── Train model ────────────────────────────────────────────────
    print("\n[3/5] Training Random Forest...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=10,
        min_samples_leaf=5,
        max_features="sqrt",
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # ── Cross-validation (5-fold) ─────────────────────────────────
    print("\n[4/5] Cross-validation (5-fold)...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="accuracy")
    print(f"  CV Accuracy: {cv_scores.mean()*100:.2f}% ± {cv_scores.std()*100:.2f}%")
    print(f"  CV Scores  : {[f'{s*100:.1f}%' for s in cv_scores]}")

    # ── Evaluation ────────────────────────────────────────────────
    print("\n[5/5] Evaluation on held-out TEST set:")
    print("-" * 50)

    y_pred = model.predict(X_test)
    test_acc = accuracy_score(y_test, y_pred)

    print(f"\nTest Accuracy: {test_acc*100:.2f}%")
    print(f"\nClassification Report:")
    print(classification_report(
        y_test, y_pred,
        target_names=["LOW", "MEDIUM", "HIGH"],
        digits=3
    ))

    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"              Pred LOW  Pred MED  Pred HIGH")
    for i, row_label in enumerate(["Actual LOW ", "Actual MED ", "Actual HIGH"]):
        print(f"  {row_label}  {cm[i][0]:8d}  {cm[i][1]:8d}  {cm[i][2]:9d}")

    # ── Feature importance ────────────────────────────────────────
    print("\nFeature Importance:")
    feature_names = ["gpa", "attendance", "avg_internal", "upc_days", "has_upc"]
    importances = model.feature_importances_
    for name, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
        bar = "█" * int(imp * 50)
        print(f"  {name:15s} {imp:.4f}  {bar}")

    # ── Validation accuracy ───────────────────────────────────────
    val_acc = accuracy_score(y_val, model.predict(X_val))
    print(f"\nValidation Accuracy : {val_acc*100:.2f}%")
    print(f"Test Accuracy       : {test_acc*100:.2f}%")
    gap = abs(val_acc - test_acc) * 100
    print(f"Val-Test Gap        : {gap:.2f}% {'✅ Good' if gap < 3 else '⚠️  Check for overfit'}")

    # ── Save ──────────────────────────────────────────────────────
    joblib.dump(model, MODEL_PATH)
    print(f"\n✅ Model saved → {MODEL_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    train()