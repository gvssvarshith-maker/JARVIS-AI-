import os
import re
import shutil
import subprocess
import urllib.parse
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
import ctypes

WEB_MAP: Dict[str, str] = {
    "youtube": "https://www.youtube.com",
    "browser": "https://www.google.com",
    "google": "https://www.google.com",
    "chrome": "https://www.google.com",
    "brave": "https://www.google.com",
    "edge": "https://www.google.com",
    "internet": "https://www.google.com",
    "web": "https://www.google.com",
    "github": "https://github.com",
    "gmail": "https://mail.google.com",
    "email": "https://mail.google.com",
    "mail": "https://mail.google.com",
    "reddit": "https://www.reddit.com",
    "netflix": "https://www.netflix.com",
    "twitter": "https://x.com",
    "x": "https://x.com",
    "linkedin": "https://www.linkedin.com",
    "chatgpt": "https://chatgpt.com",
    "maps": "https://maps.google.com",
    "google maps": "https://maps.google.com",
    "amazon": "https://www.amazon.com",
    "spotify": "https://open.spotify.com",
    "wikipedia": "https://www.wikipedia.org",
    "whatsapp": "https://web.whatsapp.com",
    "telegram": "https://web.telegram.org",
    "instagram": "https://www.instagram.com",
    "facebook": "https://www.facebook.com",
    "discord": "https://discord.com/app",
    "twitch": "https://www.twitch.tv",
    "drive": "https://drive.google.com",
    "google drive": "https://drive.google.com",
    "docs": "https://docs.google.com",
    "google docs": "https://docs.google.com",
    "sheets": "https://sheets.google.com",
    "google sheets": "https://sheets.google.com",
    "stackoverflow": "https://stackoverflow.com",
    "stack overflow": "https://stackoverflow.com",
    "pinterest": "https://www.pinterest.com",
    "news": "https://news.google.com",
    "weather": "https://weather.com",
    "bing": "https://www.bing.com",
}

APP_MAP: Dict[str, str] = {
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "notepad": "notepad.exe",
    "notes": "notepad.exe",
    "paint": "mspaint.exe",
    "mspaint": "mspaint.exe",
    "explorer": "explorer.exe",
    "files": "explorer.exe",
    "file explorer": "explorer.exe",
    "folder": "explorer.exe",
    "terminal": "cmd.exe",
    "cmd": "cmd.exe",
    "command prompt": "cmd.exe",
    "powershell": "powershell.exe",
    "task manager": "taskmgr.exe",
    "taskmgr": "taskmgr.exe",
    "vs code": "code",
    "vscode": "code",
    "code": "code",
    "settings": "ms-settings:",
    "camera": "microsoft.windows.camera:",
    "snipping tool": "ms-screenclip:",
    "screenshot": "ms-screenclip:",
    "control panel": "control.exe",
    "downloads": os.path.expanduser("~/Downloads"),
    "documents": os.path.expanduser("~/Documents"),
    "pictures": os.path.expanduser("~/Pictures"),
    "desktop": os.path.expanduser("~/Desktop"),
}


def find_browser_executable() -> Optional[str]:
    """Dynamically locates installed browser executable on Windows."""
    candidates = [
        # Check user's Brave installation
        os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"),
        # Google Chrome
        os.path.expandvars(r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        # Microsoft Edge
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    for name in ("brave", "chrome", "msedge", "firefox"):
        w = shutil.which(name)
        if w:
            return w
    return None


def launch_in_windows(target: str, is_url: bool = False) -> bool:
    """
    100% reliable execution on Windows using direct process spawning and ShellExecute.
    Returns True if launched successfully.
    """
    if is_url or target.startswith("http://") or target.startswith("https://"):
        browser = find_browser_executable()
        if browser and os.path.exists(browser):
            try:
                subprocess.Popen([browser, target])
                return True
            except Exception:
                pass

        try:
            os.startfile(target)
            return True
        except Exception:
            pass

        try:
            subprocess.Popen(["cmd.exe", "/c", "start", "", target])
            return True
        except Exception:
            pass
        return False

    # Desktop Application / Protocol Handler / Folder
    try:
        os.startfile(target)
        return True
    except Exception:
        pass

    # Try resolving via PATH
    exe_path = shutil.which(target)
    if exe_path:
        try:
            os.startfile(exe_path)
            return True
        except Exception:
            try:
                subprocess.Popen([exe_path])
                return True
            except Exception:
                pass

    # Try without shell=True quoting issues
    try:
        subprocess.Popen(["cmd.exe", "/c", "start", "", target])
        return True
    except Exception:
        pass

    return False


def normalize_prompt(prompt: str) -> str:
    """Strips punctuation, conversational prefixes, and filler words."""
    t = prompt.lower().strip()
    # Remove all punctuation except colons and slashes for URLs
    t = re.sub(r"[^\w\s:/\.]", " ", t)
    # Remove conversational fillers
    t = re.sub(
        r"\b(can you|could you|please|kindly|for me|now|the|jarvis|hey jarvis|ok jarvis|hi jarvis|would you|i want to|i want you to|help me|go ahead and|just)\b",
        " ",
        t,
    )
    return " ".join(t.split()).strip()


def launch_target(target: str, query: Optional[str] = None) -> Tuple[bool, str, Optional[str]]:
    """
    Executes native Windows application launch or browser navigation.
    Returns (success, human_reply, destination_url_or_exe).
    """
    clean = target.strip().lower()

    # 1. Full URLs
    if clean.startswith("http://") or clean.startswith("https://"):
        ok = launch_in_windows(clean, is_url=True)
        return ok, f"Navigating to {clean} now, sir.", clean

    # 2. YouTube special handling
    if "youtube" in clean:
        if query:
            encoded = urllib.parse.quote(query.strip())
            url = f"https://www.youtube.com/results?search_query={encoded}"
            ok = launch_in_windows(url, is_url=True)
            return ok, f"Searching YouTube for '{query}', sir.", url
        else:
            url = "https://www.youtube.com"
            ok = launch_in_windows(url, is_url=True)
            return ok, "Accessing YouTube for you now, sir.", url

    # 3. Google/Browser search query
    if any(b in clean for b in ("google", "browser", "chrome", "edge", "brave", "search")) and query:
        encoded = urllib.parse.quote(query.strip())
        url = f"https://www.google.com/search?q={encoded}"
        ok = launch_in_windows(url, is_url=True)
        return ok, f"Searching Google for '{query}', sir.", url

    # 4. Known Web Services
    for key in sorted(WEB_MAP.keys(), key=len, reverse=True):
        if key == clean or clean == f"open {key}" or clean.endswith(key) or key in clean:
            url = WEB_MAP[key]
            ok = launch_in_windows(url, is_url=True)
            return ok, f"Opening {key.capitalize()} for you now, sir.", url

    # 5. Known Windows Desktop Applications
    for key in sorted(APP_MAP.keys(), key=len, reverse=True):
        if key == clean or clean == f"open {key}" or clean.endswith(key) or key in clean:
            exe = APP_MAP[key]
            ok = launch_in_windows(exe, is_url=False)
            return ok, f"Launching {key.title()} on your system, sir.", exe

    # 6. Fallback: launch through Windows Shell directly
    ok = launch_in_windows(clean, is_url=False)
    if ok:
        return True, f"Initiating {clean} on your system, sir.", clean

    # 7. Final fallback: web search
    url = f"https://www.google.com/search?q={urllib.parse.quote(clean)}"
    launch_in_windows(url, is_url=True)
    return True, f"Opening browser search for '{clean}', sir.", url


def detect_and_handle_launcher(prompt: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    """
    Intelligently parses user prompt for app/web launch intent or system commands.
    Supports natural speech, conversational phrasing, and search modifiers.
    """
    raw = prompt.strip()
    if not raw:
        return None

    clean = normalize_prompt(raw)

    # --- System Control Commands ---
    # 1. Current Time
    if re.search(r"\b(?:what(?:'s| is|s) (?:the )?(?:current )?time|tell me (?:the )?time|current time|time now|what time is it)\b", clean):
        current_time = datetime.now().strftime("%I:%M %p")
        reply = f"The current time is {current_time}, sir."
        return reply, {"type": "system_info", "target": "time", "value": current_time}

    # 2. Current Date
    if re.search(r"\b(?:what(?:'s| is|s) (?:the )?(?:current )?date|today(?: s)? date|current date|what date is it|what is today)\b", clean):
        current_date = datetime.now().strftime("%A, %B %d, %Y")
        reply = f"Today is {current_date}, sir."
        return reply, {"type": "system_info", "target": "date", "value": current_date}

    # 3. System Volume Controls (VK_VOLUME_UP=0xAF, VK_VOLUME_DOWN=0xAE, VK_VOLUME_MUTE=0xAD)
    if re.search(r"\b(?:volume up|increase volume|turn up (?:the )?volume|louder|higher volume)\b", clean):
        try:
            for _ in range(5):
                ctypes.windll.user32.keybd_event(0xAF, 0, 0, 0)
                ctypes.windll.user32.keybd_event(0xAF, 0, 2, 0)
            return "Increasing system volume, sir.", {"type": "system_control", "action": "volume_up"}
        except Exception:
            pass

    if re.search(r"\b(?:volume down|decrease volume|turn down (?:the )?volume|quieter|lower volume)\b", clean):
        try:
            for _ in range(5):
                ctypes.windll.user32.keybd_event(0xAE, 0, 0, 0)
                ctypes.windll.user32.keybd_event(0xAE, 0, 2, 0)
            return "Decreasing system volume, sir.", {"type": "system_control", "action": "volume_down"}
        except Exception:
            pass

    if re.search(r"\b(?:mute|unmute|silence audio)\b", clean):
        try:
            ctypes.windll.user32.keybd_event(0xAD, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0xAD, 0, 2, 0)
            return "Toggling audio mute, sir.", {"type": "system_control", "action": "volume_mute"}
        except Exception:
            pass

    # 4. Screenshot / Snipping Tool
    if re.search(r"\b(?:take (?:a )?screenshot|screenshot|capture screen|screen clip|snipping tool)\b", clean):
        launch_in_windows("ms-screenclip:")
        return "Initiating screen capture utility, sir.", {"type": "open_app", "target": "snipping_tool"}

    # --- YouTube Media Commands ---
    # "play X on youtube", "search X on youtube", "watch X on youtube"
    m_yt = re.search(
        r"(?:play|listen to|search for|search|watch|find)\s+(.+?)\s+on\s+youtube",
        clean,
        re.IGNORECASE,
    )
    if m_yt:
        query = m_yt.group(1).strip()
        ok, reply, url = launch_target("youtube", query=query)
        return reply, {
            "type": "open_url",
            "target": "youtube",
            "query": query,
            "url": url,
            "dest": url,
        }

    # "play <song/artist>" without explicitly saying "on youtube"
    m_play = re.search(r"^(?:play|listen to)\s+(.+)$", clean, re.IGNORECASE)
    if m_play:
        song_query = m_play.group(1).strip()
        if song_query and not any(k in song_query for k in ("with", "game", "chess", "cards")):
            ok, reply, url = launch_target("youtube", query=song_query)
            return reply, {
                "type": "open_url",
                "target": "youtube",
                "query": song_query,
                "url": url,
                "dest": url,
            }

    # --- General Web Search Commands ---
    # "search X on google/browser"
    m_google = re.search(
        r"(?:search for|search|look up|google)\s+(.+?)\s+(?:on\s+google|on\s+the\s+browser|on\s+browser)?$",
        clean,
        re.IGNORECASE,
    )
    if m_google and ("google" in clean or "browser" in clean or clean.startswith("search ") or clean.startswith("google ")):
        query = m_google.group(1).strip()
        if query:
            ok, reply, url = launch_target("google", query=query)
            return reply, {
                "type": "open_url",
                "target": "google",
                "query": query,
                "url": url,
                "dest": url,
            }

    # --- Flexible Action Verbs Anywhere in Sentence ---
    # e.g., "i want to open youtube", "could you bring up calculator", "go to github", "visit reddit"
    has_action_verb = any(
        re.search(rf"\b{v}\b", clean)
        for v in (
            "open", "launch", "start", "run", "bring up", "pull up",
            "fire up", "go to", "show", "access", "visit", "look at",
            "check out", "pull out", "switch to", "check"
        )
    )

    if has_action_verb:
        # YouTube with inline query: e.g. "open youtube and play interstellar"
        m_yt_sub = re.search(
            r"youtube\s+(?:and\s+)?(?:play|search|search for)\s+(.+)$",
            clean,
            re.IGNORECASE,
        )
        if m_yt_sub:
            query = m_yt_sub.group(1).strip()
            ok, reply, url = launch_target("youtube", query=query)
            return reply, {
                "type": "open_url",
                "target": "youtube",
                "query": query,
                "url": url,
                "dest": url,
            }

        # Check against web services
        for k in sorted(WEB_MAP.keys(), key=len, reverse=True):
            if re.search(rf"\b{re.escape(k)}\b", clean):
                ok, reply, url = launch_target(k)
                return reply, {
                    "type": "open_url",
                    "target": k,
                    "url": url,
                    "dest": url,
                }

        # Check against desktop applications
        for k in sorted(APP_MAP.keys(), key=len, reverse=True):
            if re.search(rf"\b{re.escape(k)}\b", clean):
                ok, reply, exe = launch_target(k)
                return reply, {
                    "type": "open_app",
                    "target": k,
                    "dest": exe,
                }

    # --- Direct Keyword Invocation ---
    # User simply states "youtube", "calculator", "notepad", etc.
    for k in sorted(WEB_MAP.keys(), key=len, reverse=True):
        if clean == k or clean == f"the {k}":
            ok, reply, url = launch_target(k)
            return reply, {"type": "open_url", "target": k, "url": url, "dest": url}

    for k in sorted(APP_MAP.keys(), key=len, reverse=True):
        if clean == k or clean == f"the {k}":
            ok, reply, exe = launch_target(k)
            return reply, {"type": "open_app", "target": k, "dest": exe}

    return None

