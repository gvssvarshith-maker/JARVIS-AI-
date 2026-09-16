from collections import defaultdict
from typing import Any


class SessionMemory:
    def __init__(self, max_messages: int = 20) -> None:
        self.max_messages = max_messages
        self._store: dict[str, list[dict[str, Any]]] = defaultdict(list)

    def append(self, session_id: str, role: str, content: str) -> None:
        self._store[session_id].append({"role": role, "content": content})
        if len(self._store[session_id]) > self.max_messages:
            self._store[session_id] = self._store[session_id][-self.max_messages :]

    def get(self, session_id: str) -> list[dict[str, Any]]:
        return self._store[session_id].copy()
