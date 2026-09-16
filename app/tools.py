from datetime import datetime
from typing import Any
import ast
import operator as op
import urllib.parse
import urllib.request
import json

from duckduckgo_search import DDGS


REMINDERS: list[dict[str, str]] = []


ALLOWED_OPERATORS: dict[type, Any] = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.Pow: op.pow,
    ast.USub: op.neg,
}


def _safe_eval(expr: str) -> float:
    def eval_node(node: ast.AST) -> float:
        if isinstance(node, ast.Num):
            return node.n
        if isinstance(node, ast.UnaryOp) and type(node.op) in ALLOWED_OPERATORS:
            return ALLOWED_OPERATORS[type(node.op)](eval_node(node.operand))
        if isinstance(node, ast.BinOp) and type(node.op) in ALLOWED_OPERATORS:
            return ALLOWED_OPERATORS[type(node.op)](eval_node(node.left), eval_node(node.right))
        raise ValueError("Unsupported expression")

    parsed = ast.parse(expr, mode="eval")
    return eval_node(parsed.body)


def get_current_time(_: dict[str, Any]) -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def calculate(args: dict[str, Any]) -> str:
    expression = args.get("expression", "").strip()
    if not expression:
        return "Please provide an expression."
    try:
        result = _safe_eval(expression)
        return f"Result: {result}"
    except Exception as exc:
        return f"Calculation error: {exc}"


def web_search(args: dict[str, Any]) -> str:
    query = args.get("query", "").strip()
    if not query:
        return "Please provide a search query."
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
        if not results:
            return "No search results found."
        lines = []
        for idx, item in enumerate(results, start=1):
            title = item.get("title", "No title")
            href = item.get("href", "")
            snippet = item.get("body", "")
            lines.append(f"{idx}. {title}\n{href}\n{snippet}")
        return "\n\n".join(lines)
    except Exception as exc:
        return f"Search error: {exc}"


def get_weather(args: dict[str, Any]) -> str:
    city = args.get("city", "").strip()
    if not city:
        return "Please provide a city."
    try:
        encoded_city = urllib.parse.quote(city)
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={encoded_city}&count=1"
        with urllib.request.urlopen(geo_url, timeout=10) as response:
            geo_data = json.loads(response.read().decode("utf-8"))
        results = geo_data.get("results") or []
        if not results:
            return f"Could not find location for {city}."
        lat = results[0]["latitude"]
        lon = results[0]["longitude"]
        location_name = results[0].get("name", city)
        weather_url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}&current=temperature_2m,wind_speed_10m"
        )
        with urllib.request.urlopen(weather_url, timeout=10) as response:
            weather_data = json.loads(response.read().decode("utf-8"))
        current = weather_data.get("current", {})
        temp = current.get("temperature_2m", "N/A")
        wind = current.get("wind_speed_10m", "N/A")
        return f"Weather in {location_name}: {temp} C, wind {wind} km/h."
    except Exception as exc:
        return f"Weather error: {exc}"


def set_reminder(args: dict[str, Any]) -> str:
    text = args.get("text", "").strip()
    when = args.get("when", "").strip()
    if not text:
        return "Please provide reminder text."
    REMINDERS.append({"text": text, "when": when or "unspecified"})
    return f"Reminder saved: '{text}' at '{when or 'unspecified'}'."


def open_application(args: dict[str, Any]) -> str:
    app_name = args.get("app_name", "").strip()
    if not app_name:
        return "Please specify an application name."
    from app.launcher import launch_target
    ok, msg, _ = launch_target(app_name)
    return msg


def open_website(args: dict[str, Any]) -> str:
    url_or_name = args.get("url_or_name", "").strip()
    query = args.get("query", "").strip() or None
    if not url_or_name:
        return "Please specify a website or service name."
    from app.launcher import launch_target
    ok, msg, _ = launch_target(url_or_name, query=query)
    return msg


TOOLS = {
    "get_current_time": get_current_time,
    "calculate": calculate,
    "web_search": web_search,
    "get_weather": get_weather,
    "set_reminder": set_reminder,
    "open_application": open_application,
    "open_website": open_website,
}


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_current_time",
            "description": "Get the current local date and time.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Calculate a math expression.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "Example: (2+5)*3"}
                },
                "required": ["expression"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for up-to-date information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query string"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a city.",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string", "description": "City name"}},
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_reminder",
            "description": "Save a reminder note in memory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Reminder text"},
                    "when": {"type": "string", "description": "When to remind (optional)"},
                },
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_application",
            "description": "Open a local desktop application like calculator, notepad, paint, terminal, vs code, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "app_name": {"type": "string", "description": "Application name, e.g. calculator, notepad"}
                },
                "required": ["app_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_website",
            "description": "Open a website or web app like youtube, google, browser, github, etc. with optional search query.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url_or_name": {"type": "string", "description": "Website or service name, e.g. youtube, google, browser"},
                    "query": {"type": "string", "description": "Optional search term to search on the site"}
                },
                "required": ["url_or_name"],
            },
        },
    },
]
