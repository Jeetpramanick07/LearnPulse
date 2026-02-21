from pydantic import BaseModel
from typing import List, Optional

class MarkEntry(BaseModel):
    subject: str
    marks: float
    max_marks: float = 50.0

class RiskPredictionRequest(BaseModel):
    student_id: str
    gpa: float
    attendance: int
    marks: Optional[List[MarkEntry]] = []

class RiskPredictionResponse(BaseModel):
    student_id: str
    risk_score: float
    risk_level: str
    confidence: float
    factors: List[dict]

class EmailAlertRequest(BaseModel):
    student_name: str
    roll: str
    dept: str
    risk_score: float
    recipient_email: Optional[str] = None

class AdminLoginRequest(BaseModel):
    secret_key: str

class AdminLoginResponse(BaseModel):
    token: str
    message: str

class BulkRiskUpdateResponse(BaseModel):
    updated: int
    alerted: int
    message: str