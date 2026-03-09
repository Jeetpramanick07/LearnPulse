"""
admin_routes.py
───────────────
Super Admin endpoints for LearnPulse.
Mount this in your main.py with:

    from app.admin_routes import router as admin_router
    app.include_router(admin_router, prefix="/admin", tags=["admin"])

All endpoints are protected by the X-Admin-Key header.
Set ADMIN_SECRET_KEY in your .env file.
"""

import os
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from firebase_admin import auth as firebase_auth, firestore
from app.firebase_config import get_db          # your existing firebase_config.py

router = APIRouter()

# ─── Secret key guard ────────────────────────────────────────────────────────
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "superadmin123")  # put real key in .env

def verify_admin_key(x_admin_key: str = Header(...)):
    """
    Every admin endpoint requires the header:
        X-Admin-Key: <your secret key>
    """
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return True


# ─── Models ───────────────────────────────────────────────────────────────────
class DeleteUserRequest(BaseModel):
    uid: str          # Firebase Auth UID (same as Firestore doc ID)

class CreateUserRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "student"

class UpdateRoleRequest(BaseModel):
    uid: str
    role: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.delete("/user/{uid}")
def delete_user(uid: str, _: bool = Depends(verify_admin_key)):
    """
    Deletes:
      1. Firebase Auth account
      2. Firestore users/{uid} document
    Called by the frontend SuperAdminPanel when admin clicks 🗑️ Delete.
    """
    errors = []

    # 1. Delete Firebase Auth account
    try:
        firebase_auth.delete_user(uid)
    except firebase_auth.UserNotFoundError:
        errors.append(f"Auth account {uid} not found (may already be deleted)")
    except Exception as e:
        errors.append(f"Auth deletion failed: {str(e)}")

    # 2. Delete Firestore document
    try:
        db = get_db()
        db.collection("users").document(uid).delete()
    except Exception as e:
        errors.append(f"Firestore deletion failed: {str(e)}")

    if len(errors) == 2:
        # Both failed — something is seriously wrong
        raise HTTPException(status_code=500, detail=" | ".join(errors))

    return {
        "success": True,
        "uid": uid,
        "warnings": errors,   # partial failures returned as warnings, not errors
        "message": "User fully deleted" if not errors else "Partially deleted: " + errors[0],
    }


@router.delete("/users/bulk-suspended")
def delete_all_suspended(_: bool = Depends(verify_admin_key)):
    """
    Deletes ALL users whose Firestore status == 'suspended'.
    Removes both their Auth account and Firestore doc.
    Used by the 'Clear All Suspended Accounts' quick action.
    """
    db = get_db()
    suspended_docs = db.collection("users").where("status", "==", "suspended").stream()

    deleted = []
    errors  = []

    for doc in suspended_docs:
        uid = doc.id
        # Delete Auth account
        try:
            firebase_auth.delete_user(uid)
        except firebase_auth.UserNotFoundError:
            pass   # already gone from Auth, still clean up Firestore
        except Exception as e:
            errors.append({"uid": uid, "error": str(e)})
            continue

        # Delete Firestore doc
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
    """
    Creates a Firebase Auth account + Firestore doc in one backend call.
    Alternative to doing it from the frontend (avoids signing out current user).
    """
    # 1. Create Firebase Auth user
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

    # 2. Write Firestore doc
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
        # Auth user created but Firestore failed — clean up Auth to avoid orphaned accounts
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
    """
    Updates a user's role in Firestore.
    Also sets a Firebase custom claim so role can be read from Auth token.
    """
    # 1. Update Firestore
    try:
        db = get_db()
        db.collection("users").document(body.uid).update({"role": body.role})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore error: {str(e)}")

    # 2. Set Firebase custom claim (optional but useful for token-based role checks)
    try:
        firebase_auth.set_custom_user_claims(body.uid, {"role": body.role})
    except Exception as e:
        # Non-fatal — Firestore already updated
        return {
            "success": True,
            "uid": body.uid,
            "role": body.role,
            "warning": f"Custom claim not set: {str(e)}",
        }

    return {"success": True, "uid": body.uid, "role": body.role}


@router.get("/users")
def list_users(_: bool = Depends(verify_admin_key)):
    """
    Returns all users from Firestore.
    The frontend uses Firestore directly (realtime), but this is useful for
    server-side exports or scripts.
    """
    db = get_db()
    docs = db.collection("users").stream()
    return {
        "users": [{"id": d.id, **d.to_dict()} for d in docs]
    }