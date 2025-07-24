import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.users import User  # Make sure this matches your import

client = TestClient(app)

def test_delete_latest_user():
    db = SessionLocal()
    try:
        # Get the most recently created user
        user = db.query(User).order_by(User.created_at.desc()).first()
        assert user is not None, "No user found to delete."

        user_id = user.id

        # Send DELETE request
        response = client.delete(f"/users/{user_id}")
        assert response.status_code == 200
        assert response.json() == {"detail": f"User with ID {user_id} deleted successfully."}

        # Confirm the user is deleted
        response_check = client.delete(f"/users/{user_id}")
        assert response_check.status_code == 404

    finally:
        db.close()
