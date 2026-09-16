import json
import os
from typing import Any

from openai import OpenAI

from app.tools import TOOLS, TOOL_SCHEMAS


SYSTEM_PROMPT = (
    "You are Jarvis, a concise and helpful AI assistant. "
    "Use tools when they can improve factuality. "
    "If a tool fails, explain briefly and continue helpfully."
)


def _client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Set it in .env.")
    return OpenAI(api_key=api_key)


def run_agent(messages: list[dict[str, Any]]) -> str:
    client = _client()
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    composed_messages = [{"role": "system", "content": SYSTEM_PROMPT}, *messages]

    response = client.chat.completions.create(
        model=model,
        messages=composed_messages,
        tools=TOOL_SCHEMAS,
        tool_choice="auto",
    )

    msg = response.choices[0].message
    composed_messages.append(msg)

    if msg.tool_calls:
        for tool_call in msg.tool_calls:
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments or "{}")
            tool_func = TOOLS.get(tool_name)

            if tool_func is None:
                tool_output = f"Tool '{tool_name}' is not available."
            else:
                tool_output = tool_func(tool_args)

            composed_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": tool_name,
                    "content": tool_output,
                }
            )

        final = client.chat.completions.create(
            model=model,
            messages=composed_messages,
        )
        return final.choices[0].message.content or "I could not generate a response."

    return msg.content or "I could not generate a response."
