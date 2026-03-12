"""
admin_routes.py
───────────────
Super Admin endpoints for LearnPulse.
"""

import os
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from firebase_admin import auth as firebase_auth, firestore
from app.firebase_config import get_db

router = APIRouter()

ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "superadmin123")

def verify_admin_key(x_admin_key: str = Header(...)):
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return True


class DeleteUserRequest(BaseModel):
    uid: str

class CreateUserRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "student"

class UpdateRoleRequest(BaseModel):
    uid: str
    role: str


@router.delete("/user/{uid}")
def delete_user(uid: str, _: bool = Depends(verify_admin_key)):
    get_db()  # ensure Firebase initialized
    errors = []

    try:
        firebase_auth.delete_user(uid)
    except firebase_auth.UserNotFoundError:
        errors.append(f"Auth account {uid} not found (may already be deleted)")
    except Exception as e:
        errors.append(f"Auth deletion failed: {str(e)}")

    try:
        db = get_db()
        db.collection("users").document(uid).delete()
    except Exception as e:
        errors.append(f"Firestore deletion failed: {str(e)}")

    if len(errors) == 2:
        raise HTTPException(status_code=500, detail=" | ".join(errors))

    return {
        "success": True,
        "uid": uid,
        "warnings": errors,
        "message": "User fully deleted" if not errors else "Partially deleted: " + errors[0],
    }


@router.delete("/users/bulk-suspended")
def delete_all_suspended(_: bool = Depends(verify_admin_key)):
    db = get_db()  # ensure Firebase initialized
    suspended_docs = db.collection("users").where("status", "==", "suspended").stream()

    deleted = []
    errors  = []

    for doc in suspended_docs:
        uid = doc.id
        try:
            firebase_auth.delete_user(uid)
        except firebase_auth.UserNotFoundError:
            pass
        except Exception as e:
            errors.append({"uid": uid, "error": str(e)})
            continue

        try:
            db.collection("users").document(uid).delete()
            deleted.append(uid)
        except Exception as e:
            errors.append({"uid": uid, "error": f"Firestore: {str(e)}"})

    return {
        "success": True,
        "deleted_count": len(deleted),
        "deleted_uids": deleted,
        "errors": errors,
    }


@router.post("/user")
def create_user(body: CreateUserRequest, _: bool = Depends(verify_admin_key)):
    get_db()  # ensure Firebase initialized

    try:
        user_record = firebase_auth.create_user(
            email=body.email,
            password=body.password,
            display_name=body.name,
        )
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email already in use")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    uid = user_record.uid

    try:
        db = get_db()
        db.collection("users").document(uid).set({
            "name":      body.name,
            "email":     body.email,
            "role":      body.role,
            "status":    "active",
            "createdAt": firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        firebase_auth.delete_user(uid)
        raise HTTPException(status_code=500, detail=f"Firestore write failed: {str(e)}")

    return {
        "success": True,
        "uid": uid,
        "email": body.email,
        "name": body.name,
        "role": body.role,
    }


@router.patch("/user/role")
def update_role(body: UpdateRoleRequest, _: bool = Depends(verify_admin_key)):
    get_db()  # ensure Firebase initialized

    try:
        db = get_db()
        db.collection("users").document(body.uid).update({"role": body.role})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore error: {str(e)}")

    try:
        firebase_auth.set_custom_user_claims(body.uid, {"role": body.role})
    except Exception as e:
        return {
            "success": True,
            "uid": body.uid,
            "role": body.role,
            "warning": f"Custom claim not set: {str(e)}",
        }

    return {"success": True, "uid": body.uid, "role": body.role}


@router.get("/users")
def list_users(_: bool = Depends(verify_admin_key)):
    db = get_db()  # ensure Firebase initialized
    docs = db.collection("users").stream()
    return {
        "users": [{"id": d.id, **d.to_dict()} for d in docs]
    }