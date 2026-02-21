import firebase_admin
from firebase_admin import credentials, firestore
import os

_db = None

def get_db():
    """Initialize and return Firestore client"""
    global _db
    if _db is not None:
        return _db
    
    # Check if Firebase credentials exist
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
    
    if os.path.exists(cred_path):
        # Use service account file
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # Use default credentials (for deployment)
        try:
            firebase_admin.initialize_app()
        except ValueError:
            # Already initialized
            pass
    
    _db = firestore.client()
    return _db