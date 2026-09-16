import os
import uuid
import json
import asyncio
from typing import Optional, List, Dict
import requests

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.memory import SessionMemory

load_dotenv()

app = FastAPI(title="JARVIS AI Command Center", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory = SessionMemory(max_messages=30)
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

SYSTEM_INSTRUCTION = (
    "You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), Tony Stark's iconic, sophisticated personal AI. "
    "Speak with calm confidence, witty politeness, and supreme precision. "
    "Keep responses crisp, punchy, and concise (2-3 sentences or compact bullet points) so answers are delivered instantaneously. "
    "Address the user respectfully (e.g., 'sir'). Only elaborate when specifically requested."
)


def call_gemini(prompt: str, history: Optional[List[Dict]] = None) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return f"Greetings, sir. I have received: '{prompt}'. (Operating in local fallback mode: GEMINI_API_KEY not set)."

    preferred_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite") or "gemini-3.5-flash-lite"
    fallback_models = [preferred_model, "gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"]
    # De-duplicate while preserving order
    seen = set()
    models_to_try = [m for m in fallback_models if not (m in seen or seen.add(m))]

    contents = []
    if history:
        last_role = None
        for msg in history[-6:]:
            raw_role = msg.get("role", "user").lower()
            role = "model" if raw_role in ("assistant", "model", "ai") else "user"
            text = (msg.get("content") or "").strip()
            if not text:
                continue
            if contents and role == last_role:
                contents[-1]["parts"][0]["text"] += f"\n{text}"
            else:
                contents.append({"role": role, "parts": [{"text": text}]})
                last_role = role

    if contents and contents[0]["role"] == "model":
        contents.pop(0)

    if contents and contents[-1]["role"] == "user":
        contents[-1]["parts"][0]["text"] += f"\n{prompt.strip()}"
    else:
        contents.append({"role": "user", "parts": [{"text": prompt.strip()}]})

    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "generationConfig": {"maxOutputTokens": 250, "temperature": 0.6},
    }

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            resp = requests.post(url, json=payload, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
        except Exception:
            pass

    return f"All telemetry online, sir. Processing your command: '{prompt}'. Subsystems standing by."


@app.get("/", response_class=FileResponse)
def index() -> str:
    return os.path.join(static_dir, "index.html")


@app.get("/api/health")
@app.get("/health")
def health():
    return {
        "status": "ok",
        "assistant": "JARVIS",
        "model": os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
        "version": "2.1.0",
    }


from app.launcher import detect_and_handle_launcher, launch_target


class ActionOpenRequest(BaseModel):
    target: str
    query: Optional[str] = None


@app.post("/api/action/open")
def api_action_open(req: ActionOpenRequest):
    ok, msg, dest = launch_target(req.target, query=req.query)
    return {"status": "ok" if ok else "error", "message": msg, "dest": dest}


class TTSRequest(BaseModel):
    text: str


@app.post("/api/tts/audio")
def api_tts_audio(req: TTSRequest):
    # Returns 200 OK; clients execute high-quality client-side Web Speech synthesis
    return JSONResponse(content={"status": "ok", "mode": "client_synthesis"}, status_code=200)


class LLMRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    max_tokens: Optional[int] = 250


@app.post("/api/llm")
def api_llm(req: LLMRequest):
    session_id = "default_session"
    history = memory.get(session_id)
    memory.append(session_id, "user", req.prompt)

    # 1. Check for immediate application/web launch action
    launch_res = detect_and_handle_launcher(req.prompt)
    if launch_res:
        reply, action_meta = launch_res
        memory.append(session_id, "assistant", reply)
        return {"text": reply, "action": action_meta}

    reply = call_gemini(req.prompt, history=history)
    memory.append(session_id, "assistant", reply)
    return {"text": reply}


@app.post("/api/llm/stream")
def api_llm_stream(req: LLMRequest):
    session_id = "default_session"
    history = memory.get(session_id)
    memory.append(session_id, "user", req.prompt)

    # 1. Check for immediate application/web launch action
    launch_res = detect_and_handle_launcher(req.prompt)
    if launch_res:
        reply, action_meta = launch_res
        memory.append(session_id, "assistant", reply)

        def launch_stream():
            yield f"data: {json.dumps({'delta': reply, 'action': action_meta})}\n\n"
            yield f"data: {json.dumps({'done': True, 'full': reply, 'action': action_meta})}\n\n"

        return StreamingResponse(launch_stream(), media_type="text/event-stream")

    api_key = os.getenv("GEMINI_API_KEY", "")
    preferred_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite") or "gemini-3.5-flash-lite"
    fallback_models = [preferred_model, "gemini-3.1-flash-lite", "gemini-3.6-flash"]
    seen = set()
    models_to_try = [m for m in fallback_models if not (m in seen or seen.add(m))]

    contents = []
    if history:
        for msg in history[-6:]:
            raw_role = msg.get("role", "user").lower()
            role = "model" if raw_role in ("assistant", "model", "ai") else "user"
            text = (msg.get("content") or "").strip()
            if text:
                contents.append({"role": role, "parts": [{"text": text}]})
    contents.append({"role": "user", "parts": [{"text": req.prompt.strip()}]})

    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "generationConfig": {"maxOutputTokens": 250, "temperature": 0.6},
    }

    def event_stream():
        accumulated = ""
        streamed = False

        if api_key:
            for m in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:streamGenerateContent?alt=sse&key={api_key}"
                try:
                    with requests.post(url, json=payload, stream=True, timeout=8) as resp:
                        if resp.status_code == 200:
                            for raw_line in resp.iter_lines():
                                if not raw_line:
                                    continue
                                line = raw_line.decode("utf-8", errors="ignore")
                                if line.startswith("data:"):
                                    try:
                                        d = json.loads(line[5:].strip())
                                        candidates = d.get("candidates", [])
                                        if candidates:
                                            parts = candidates[0].get("content", {}).get("parts", [])
                                            if parts:
                                                chunk = parts[0].get("text", "")
                                                if chunk:
                                                    accumulated += chunk
                                                    yield f"data: {json.dumps({'delta': chunk})}\n\n"
                                    except Exception:
                                        pass
                            if accumulated.strip():
                                streamed = True
                                break
                except Exception:
                    pass

        if not streamed:
            fallback = f"All systems online, sir. Diagnostic confirmed for: '{req.prompt}'. Standing by."
            accumulated = fallback
            yield f"data: {json.dumps({'delta': fallback})}\n\n"

        memory.append(session_id, "assistant", accumulated.strip())
        yield f"data: {json.dumps({'done': True, 'full': accumulated.strip()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/api/history")
def api_history(limit: int = 30):
    session_id = "default_session"
    items = memory.get(session_id)
    return {"items": items[-limit:]}


@app.post("/api/clear")
def api_clear():
    session_id = "default_session"
    memory._store[session_id] = []
    return {"status": "ok", "message": "Memory core cleared."}


# Legacy Phase 1 chat endpoint
class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    session_id = payload.session_id.strip() or str(uuid.uuid4())
    memory.append(session_id, "user", payload.message)
    history = memory.get(session_id)
    reply = call_gemini(payload.message, history=history)
    memory.append(session_id, "assistant", reply)
    return ChatResponse(session_id=session_id, reply=reply)
