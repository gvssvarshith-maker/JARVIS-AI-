# Jarvis Phase 1 (MVP)

A practical Phase 1 starter for a Jarvis-like AI assistant:
- FastAPI backend
- OpenAI chat + tool calling
- Session memory
- Built-in tools: time, calculator, web search, weather, reminders
- Minimal web chat UI

## 1) Setup

```powershell
cd C:\Users\gvssv\jarvis-phase1
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Then open `.env` and set your `OPENAI_API_KEY`.

## 2) Run

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open:
- http://127.0.0.1:8000 (chat UI)
- http://127.0.0.1:8000/docs (API docs)

## 3) Try prompts

- "What time is it right now?"
- "Calculate (32*5) + 100 / 4"
- "Search latest AI news today"
- "What's weather in Hyderabad?"
- "Remind me to drink water at 8 pm"

## Notes

- Session memory is currently in-process (resets on server restart).
- Weather uses Open-Meteo public API.
- Web search uses DuckDuckGo results.
- This is a strong base for Phase 2 (planning loops, persistent memory, more actions).
