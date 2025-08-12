from fastapi.testclient import TestClient
from app.main import app
import uuid

client = TestClient(app)

def generate_version():
    return {
        "version_name": f"Test Version {uuid.uuid4().hex[:6]}",
        "version_abbr": f"TV{uuid.uuid4().hex[:4]}"
    }

def test_create_version_success():
    version = generate_version()
    response = client.post("/versions/", json=version)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["version_name"] == version["version_name"]
    assert data["version_abbr"] == version["version_abbr"]
    assert data["is_active"] is True

def test_create_duplicate_version_abbr():
    version = generate_version()
    client.post("/versions/", json=version)
    duplicate = version.copy()
    duplicate["version_name"] = f"Another {uuid.uuid4().hex[:4]}"
    response = client.post("/versions/", json=duplicate)
    assert response.status_code == 409
    assert "abbreviation already exists" in response.json()["detail"]

def test_get_all_versions():
    response = client.get("/versions/")
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)

def test_get_version_by_id_success():
    version = generate_version()
    create_resp = client.post("/versions/", json=version)
    version_id = create_resp.json()["data"]["version_id"]

    response = client.get(f"/versions/{version_id}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["version_id"] == version_id

def test_get_version_by_id_not_found():
    fake_id = str(uuid.uuid4())
    response = client.get(f"/versions/{fake_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]

def test_update_version_success():
    version = generate_version()
    create_resp = client.post("/versions/", json=version)
    version_id = create_resp.json()["data"]["version_id"]

    update_data = {
        "version_name": f"Updated Name {uuid.uuid4().hex[:4]}",
        "version_abbr": f"UA{uuid.uuid4().hex[:4]}",  # ensure uniqueness
        "is_active": False
    }

    response = client.put(f"/versions/{version_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["version_name"].startswith("Updated Name")
    assert data["is_active"] is False


def test_delete_version_success():
    version = generate_version()
    create_resp = client.post("/versions/", json=version)
    version_id = create_resp.json()["data"]["version_id"]

    delete_resp = client.delete(f"/versions/{version_id}")
    assert delete_resp.status_code == 200
    assert "deleted successfully" in delete_resp.json()["message"]

    # Confirm deletion (soft-delete: expect 404)
    recheck = client.get(f"/versions/{version_id}")
    assert recheck.status_code == 404  # only if GET filters is_active=True


def test_delete_nonexistent_version():
    fake_id = str(uuid.uuid4())
    response = client.delete(f"/versions/{fake_id}")
    assert response.status_code == 404

def test_get_version_by_name_success():
    version = generate_version()
    create_resp = client.post("/versions/", json=version)
    assert create_resp.status_code == 201

    response = client.get(f"/versions/by-name/{version['version_name']}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["version_name"] == version["version_name"]
    assert data["version_abbr"] == version["version_abbr"]

def test_get_version_by_abbr_success():
    version = generate_version()
    create_resp = client.post("/versions/", json=version)
    assert create_resp.status_code == 201

    response = client.get(f"/versions/by-abbr/{version['version_abbr']}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["version_abbr"] == version["version_abbr"]
    assert data["version_name"] == version["version_name"]

def test_get_version_by_name_not_found():
    response = client.get("/versions/by-name/NonExistentVersionName")
    assert response.status_code == 404

def test_get_version_by_abbr_not_found():
    response = client.get("/versions/by-abbr/NXVA1234")
    assert response.status_code == 404
