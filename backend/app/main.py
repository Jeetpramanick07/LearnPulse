import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv


from app.models import (
    RiskPredictionRequest, RiskPredictionResponse,
    EmailAlertRequest, AdminLoginRequest, AdminLoginResponse,
    BulkRiskUpdateResponse,
)
from app.firebase_config import get_db
from app.email_service import send_risk_alert
from app.ml.predict import predict_risk

load_dotenv()

app = FastAPI(title="LearnPulse API", version="2.0.0")

# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# KEYS
# -----------------------------
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "learnpulse_admin_secret_2024")
TEACHER_SECRET_KEY = os.getenv("TEACHER_SECRET_KEY", "learnpulse_teacher_secret_2024")
HIGH_RISK_THRESHOLD = int(os.getenv("HIGH_RISK_THRESHOLD", 70))


# -----------------------------
# ROLE VERIFICATION
# -----------------------------
def verify_admin(x_admin_key: str = Header(...)):
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return True


def verify_teacher(x_teacher_key: str = Header(...)):
    if x_teacher_key != TEACHER_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Only teachers allowed")
    return True


def get_student_identity(
    x_user_id: str = Header(...),
    x_role: str = Header(...)
):
    if x_role not in ["student", "teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Invalid role")

    return {
        "user_id": x_user_id,
        "role": x_role
    }


# -----------------------------
# ROOT
# -----------------------------
@app.get("/")
def root():
    return {"message": "LearnPulse API running with RBAC 🚀"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# -----------------------------
# ADMIN LOGIN
# -----------------------------
@app.post("/admin/login", response_model=AdminLoginResponse)
def admin_login(body: AdminLoginRequest):
    if body.secret_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    return AdminLoginResponse(
        token=ADMIN_SECRET_KEY,
        message="Admin access granted"
    )


# ============================================================
# MARKS MANAGEMENT (NEW - RBAC)
# ============================================================

# -----------------------------
# TEACHER ADD MARKS
# -----------------------------
@app.post("/teacher/add-marks")
def add_marks(
    student_id: str,
    subject: str,
    marks: int,
    _: bool = Depends(verify_teacher)
):
    try:
        db = get_db()

        doc = db.collection("marks").add({
            "studentId": student_id,
            "subject": subject,
            "marks": marks
        })

        return {
            "message": "Marks added successfully",
            "mark_id": doc[1].id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# TEACHER UPDATE MARKS
# -----------------------------
@app.put("/teacher/update-marks/{mark_id}")
def update_marks(
    mark_id: str,
    marks: int,
    _: bool = Depends(verify_teacher)
):
    try:
        db = get_db()

        db.collection("marks").document(mark_id).update({
            "marks": marks
        })

        return {"message": "Marks updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# TEACHER DELETE MARKS
# -----------------------------
@app.delete("/teacher/delete-marks/{mark_id}")
def delete_marks(
    mark_id: str,
    _: bool = Depends(verify_teacher)
):
    try:
        db = get_db()

        db.collection("marks").document(mark_id).delete()

        return {"message": "Marks deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# STUDENT VIEW OWN MARKS
# -----------------------------
@app.get("/student/marks")
def get_my_marks(identity=Depends(get_student_identity)):
    try:
        db = get_db()

        if identity["role"] == "student":

            marks = [
                {**m.to_dict(), "id": m.id}
                for m in db.collection("marks")
                .where("studentId", "==", identity["user_id"])
                .stream()
            ]

        else:
            # teacher/admin can see all
            marks = [
                {**m.to_dict(), "id": m.id}
                for m in db.collection("marks").stream()
            ]

        return {
            "marks": marks,
            "total": len(marks)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# EXISTING RISK SYSTEM (UNCHANGED)
# ============================================================

@app.post("/predict-risk", response_model=RiskPredictionResponse)
def predict_student_risk(body: RiskPredictionRequest):
    try:

        marks_list = [m.model_dump() for m in body.marks] if body.marks else []

        result = predict_risk(
            gpa=body.gpa,
            attendance=body.attendance,
            marks=marks_list
        )

        return RiskPredictionResponse(
            student_id=body.student_id,
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            confidence=result["confidence"],
            factors=result["factors"],
        )

    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="ML model not trained.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ADMIN BULK UPDATE
# -----------------------------
@app.post("/update-all-risks", response_model=BulkRiskUpdateResponse)
def update_all_risks(_: bool = Depends(verify_admin)):

    try:

        db = get_db()

        students = [
            s.to_dict() | {"id": s.id}
            for s in db.collection("students").stream()
        ]

        all_marks = [
            m.to_dict()
            for m in db.collection("marks").stream()
        ]

        updated = 0
        alerted = 0

        for student in students:

            sid = student["id"]

            marks = [
                m for m in all_marks
                if m.get("studentId") == sid
            ]

            result = predict_risk(
                gpa=student.get("gpa", 5.0),
                attendance=student.get("attendance", 75),
                marks=marks
            )

            db.collection("students").document(sid).update({
                "risk": round(result["risk_score"])
            })

            updated += 1

            if result["risk_score"] >= HIGH_RISK_THRESHOLD:

                sent = send_risk_alert(
                    student_name=student.get("name"),
                    roll=student.get("roll"),
                    dept=student.get("dept"),
                    risk_score=result["risk_score"],
                    risk_level=result["risk_level"]
                )

                if sent:
                    alerted += 1

        return BulkRiskUpdateResponse(
            updated=updated,
            alerted=alerted,
            message=f"Updated {updated} students"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))