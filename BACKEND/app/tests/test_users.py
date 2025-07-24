from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_delete_first_available_user():
    # Step 1: Fetch existing users
    response = client.get("/users/")
    assert response.status_code == 200

    users = response.json()
    
    # Step 2: Fail early if no users exist
    assert users, "No users found. Ensure a user is created before this test runs."

    # Step 3: Pick the first user and attempt deletion
    user_id = users[0]["id"]
    delete_response = client.delete(f"/users/{user_id}")
    
    # Step 4: Assert deletion success
    assert delete_response.status_code == 200
    assert delete_response.json()["detail"] == "User deleted successfully"

    print(f"✅ User with ID {user_id} deleted successfully.")
