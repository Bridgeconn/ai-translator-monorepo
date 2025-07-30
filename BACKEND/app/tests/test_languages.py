from fastapi.testclient import TestClient
from app.main import app
import uuid

client = TestClient(app)

def generate_language():
    return {
        "name": f"Lang{uuid.uuid4().hex[:5]}",
        "BCP_code": f"bcp{uuid.uuid4().hex[:3]}",
        "ISO_code": f"iso{uuid.uuid4().hex[:3]}"
    }

def test_create_language_success():
    lang = generate_language()
    response = client.post("/languages/", json=lang)
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["BCP_code"] == lang["BCP_code"]
    assert data["ISO_code"] == lang["ISO_code"]

def test_create_language_duplicate_code():
    lang = generate_language()
    client.post("/languages/", json=lang)
    response = client.post("/languages/", json=lang)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]

def test_get_language_by_code():
    lang = generate_language()
    create = client.post("/languages/", json=lang)
    code = create.json()["data"]["BCP_code"]
    response = client.get(f"/languages/code/{code}")
    assert response.status_code == 200
    assert response.json()["data"]["BCP_code"] == code

def test_get_language_by_iso():
    lang = generate_language()
    create = client.post("/languages/", json=lang)
    iso = create.json()["data"]["ISO_code"]
    response = client.get(f"/languages/iso/{iso}")
    assert response.status_code == 200
    assert response.json()["data"]["ISO_code"] == iso

def test_get_language_by_name():
    lang = generate_language()
    create = client.post("/languages/", json=lang)
    name = create.json()["data"]["name"]
    response = client.get(f"/languages/name/{name}")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == name

def test_get_language_by_id():
    lang = generate_language()
    create = client.post("/languages/", json=lang)
    lang_id = create.json()["data"]["id"]
    response = client.get(f"/languages/id/{lang_id}")
    assert response.status_code == 200
    assert response.json()["data"]["id"] == lang_id

def test_get_language_by_any_bcp():
    lang = generate_language()
    create = client.post("/languages/", json=lang)
    bcp = create.json()["data"]["BCP_code"]
    response = client.get(f"/languages/search/{bcp}")
    assert response.status_code == 200
    assert response.json()["data"]["BCP_code"] == bcp

def test_get_language_by_any_iso():
    lang = generate_language()
    create = client.post("/languages/", json=lang)
    iso = create.json()["data"]["ISO_code"]
    response = client.get(f"/languages/search/{iso}")
    assert response.status_code == 200
    assert response.json()["data"]["ISO_code"] == iso

def test_get_language_by_any_name():
    lang = generate_language()
    create = client.post("/languages/", json=lang)
    name = create.json()["data"]["name"]
    response = client.get(f"/languages/search/{name}")
    assert response.status_code == 200
    assert response.json()["data"]["name"] == name

def test_get_language_by_any_id():
    lang = generate_language()
    create = client.post("/languages/", json=lang)
    lang_id = create.json()["data"]["id"]
    response = client.get(f"/languages/search/{lang_id}")
    assert response.status_code == 200
    assert response.json()["data"]["id"] == lang_id

def test_get_all_languages():
    response = client.get("/languages/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_update_language():
    lang = generate_language()
    create = client.post("/languages/", json=lang)
    lang_id = create.json()["data"]["id"]
    update = {"name": "Updated Name"}
    response = client.put(f"/languages/{lang_id}", json=update)
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Updated Name"

def test_delete_language():
    lang = generate_language()
    create = client.post("/languages/", json=lang)
    lang_id = create.json()["data"]["id"]
    response = client.delete(f"/languages/{lang_id}")
    assert response.status_code == 200
    assert "deleted" in response.json()["message"]
