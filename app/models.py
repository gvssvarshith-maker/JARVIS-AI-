from typing import Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique session ID for memory")
    message: str = Field(..., min_length=1, description="User input message")


class ChatResponse(BaseModel):
    session_id: str
    reply: str


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
