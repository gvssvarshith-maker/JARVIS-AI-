# pyrefly: ignore [missing-import]
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["assistant"] == "JARVIS"


def test_history_and_clear_endpoints():
    response = client.get("/api/history")
    assert response.status_code == 200
    assert "items" in response.json()

    clear_resp = client.post("/api/clear")
    assert clear_resp.status_code == 200
    assert clear_resp.json()["status"] == "ok"


def test_llm_endpoint_mock_call():
    response = client.post("/api/llm", json={"prompt": "System check"})
    assert response.status_code == 200
    assert "text" in response.json()
    assert len(response.json()["text"]) > 0


def test_launcher_detection_and_action_endpoint():
    from app.launcher import detect_and_handle_launcher

    # 1. Test unit detection variations
    res_yt = detect_and_handle_launcher("open youtube")
    assert res_yt is not None
    assert "YouTube" in res_yt[0]
    assert res_yt[1]["type"] == "open_url"

    res_yt_punct = detect_and_handle_launcher("can you open youtube now.")
    assert res_yt_punct is not None
    assert "YouTube" in res_yt_punct[0]

    res_calc = detect_and_handle_launcher("hey jarvis open calculator")
    assert res_calc is not None
    assert "Calculator" in res_calc[0]
    assert res_calc[1]["type"] == "open_app"

    res_time = detect_and_handle_launcher("what is the current time")
    assert res_time is not None
    assert "current time is" in res_time[0]

    res_date = detect_and_handle_launcher("what is today's date")
    assert res_date is not None
    assert "Today is" in res_date[0]

    # 2. Test LLM intercept with action
    resp = client.post("/api/llm", json={"prompt": "open youtube"})
    assert resp.status_code == 200
    data = resp.json()
    assert "action" in data
    assert data["action"]["type"] == "open_url"
    assert "YouTube" in data["text"]

    # 3. Test /api/action/open endpoint
    act_resp = client.post("/api/action/open", json={"target": "browser"})
    assert act_resp.status_code == 200
    assert act_resp.json()["status"] == "ok"


def test_tts_audio_endpoint():
    resp = client.post("/api/tts/audio", json={"text": "All systems operational, sir."})
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


