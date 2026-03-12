import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    """Initialize and return Firestore client"""
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        cred_b64  = os.getenv("FIREBASE_CREDENTIALS_B64")
        cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")

        if cred_b64:
            # ✅ Best for Render: base64-encoded JSON avoids newline issues
            cred_dict = json.loads(base64.b64decode(cred_b64).decode("utf-8"))
            cred = credentials.Certificate(cred_dict)
        elif cred_json:
            # Fallback: raw JSON string
            cred = credentials.Certificate(json.loads(cred_json))
        else:
            # Local development: read from file
            cred = credentials.Certificate("serviceAccountKey.json")

        firebase_admin.initialize_app(cred)

    _db = firestore.client()
    return _db