import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    """Initialize and return Firestore client"""
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")

        if cred_json:
            # ✅ Production (Render): load from environment variable
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
        else:
            # ✅ Local development: load from serviceAccountKey.json file
            cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
            cred = credentials.Certificate(cred_path)

        firebase_admin.initialize_app(cred)

    _db = firestore.client()
    return _db