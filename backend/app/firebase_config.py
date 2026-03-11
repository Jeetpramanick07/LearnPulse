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
        # Option 1: credentials from environment variable (Render / production)
        cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if cred_json:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)

        # Option 2: credentials from local file (local development)
        else:
            cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                # Option 3: default credentials (e.g. Google Cloud environment)
                firebase_admin.initialize_app()

    _db = firestore.client()
    return _db