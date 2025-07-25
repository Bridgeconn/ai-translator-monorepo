import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_language():
    data = {"name": "French", "code": "fr"}
    response = client.post("/languages/", json=data)
    assert response.status_code == 200
    assert response.json()["code"] == "fr"
    assert response.json()["name"] == "French"

def test_get_language_by_code():
    response = client.get("/languages/fr")
    assert response.status_code == 200
    assert response.json()["name"] == "French"
    assert response.json()["code"] == "fr"

def test_get_non_existing_language():
    response = client.get("/languages/xyz")
    assert response.status_code == 404
    assert response.json()["detail"] == "Language not found"

def test_get_language_by_name():
    # First create a language
    client.post("/languages/", json={"name": "Hindi", "code": "hi"})

    # Now fetch by name
    response = client.get("/languages/by-name/Hindi")
    assert response.status_code == 200
    assert response.json()["name"] == "Hindi"
    assert response.json()["code"] == "hi"

def test_get_language_by_name_not_found():
    response = client.get("/languages/by-name/NonExistingLang")
    assert response.status_code == 404
    assert response.json()["detail"] == "Language not found"
