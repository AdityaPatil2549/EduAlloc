"""Integration tests for backend APIs."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock

from api.main import app
from models.school import SchoolDetail, SchoolSummary

client = TestClient(app)

@pytest.fixture
def mock_bq(mocker):
    mock = AsyncMock()
    mock.get_schools.return_value = [
        {"school_id": "27031070001", "school_name": "Z.P. School Test", "di_score": 85}
    ]
    mock.get_school_detail.return_value = {
        "school_id": "27031070001", "school_name": "Z.P. School Test", "di_score": 85
    }
    mocker.patch("api.deps.get_bq_client", return_value=mock)
    # Also patch app.state
    app.state.bq = mock
    return mock

@pytest.fixture
def mock_auth(mocker):
    mocker.patch("api.deps.verify_firebase_token", return_value={"uid": "test_user"})

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0.0"}

def test_get_schools(mock_bq, mock_auth):
    response = client.get("/api/schools?district_id=NDB01")
    assert response.status_code == 200
    data = response.json()
    assert "schools" in data
    assert len(data["schools"]) == 1
    assert data["schools"][0]["school_id"] == "27031070001"

def test_get_school_detail(mock_bq, mock_auth):
    response = client.get("/api/schools/27031070001")
    assert response.status_code == 200
    data = response.json()
    assert data["school_id"] == "27031070001"
