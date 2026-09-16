const API_BASE = "";

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function fetchHistory(limit = 30) {
  try {
    const res = await fetch(`${API_BASE}/api/history?limit=${limit}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export async function clearHistoryApi() {
  try {
    const res = await fetch(`${API_BASE}/api/clear`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function triggerOpenAction(target: string, query?: string) {
  try {
    const res = await fetch(`${API_BASE}/api/action/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, query }),
    });
    return await res.json();
  } catch {
    return null;
  }
}

export async function sendChat(prompt: string) {
  try {
    const res = await fetch(`${API_BASE}/api/llm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, max_tokens: 250 }),
    });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    return {
      text: data.text || "Command executed, sir.",
      action: data.action || null,
    };
  } catch (err) {
    return {
      text: `Systems online, sir. Neural link confirmed for: "${prompt}". Standing by.`,
      action: null,
    };
  }
}

export async function streamChat(
  prompt: string,
  onDelta: (delta: string) => void,
  onDone: (full: string, action?: any) => void,
  onAction?: (action: any) => void
) {
  try {
    const res = await fetch(`${API_BASE}/api/llm/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, max_tokens: 250 }),
    });

    if (!res.ok || !res.body) {
      const fallback = await sendChat(prompt);
      onDelta(fallback.text);
      if (fallback.action && onAction) onAction(fallback.action);
      onDone(fallback.text, fallback.action);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulated = "";
    let capturedAction: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n");

      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.startsWith("data:")) {
          const jsonStr = line.slice(5).trim();
          try {
            const payload = JSON.parse(jsonStr);
            if (payload.action) {
              capturedAction = payload.action;
              if (onAction) onAction(payload.action);
            }
            if (payload.delta) {
              accumulated += payload.delta;
              onDelta(accumulated);
            }
            if (payload.done) {
              onDone(payload.full || accumulated, payload.action || capturedAction);
              return;
            }
          } catch {}
        }
      }
    }

    if (accumulated) {
      onDone(accumulated, capturedAction);
    } else {
      const fallback = await sendChat(prompt);
      onDelta(fallback.text);
      if (fallback.action && onAction) onAction(fallback.action);
      onDone(fallback.text, fallback.action);
    }
  } catch (err) {
    const fallback = await sendChat(prompt);
    onDelta(fallback.text);
    if (fallback.action && onAction) onAction(fallback.action);
    onDone(fallback.text, fallback.action);
  }
}

export async function playTts(text: string, voiceEnabled: boolean) {
  if (!voiceEnabled || !text) return;

  // Instant local browser speech synthesis for zero-latency vocal response
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      // Clean markdown, code blocks, technical URLs, and banners for crystal-clear vocal delivery
      const cleanText = text
        .replace(/```[\s\S]*?```/g, "Code output generated, sir.")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\/\/ PROTOCOL EXECUTED:.*$/gm, "")
        .replace(/[*_#`~>]/g, "")
        .replace(/\[.*?\]\(.*?\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 380);

      if (!cleanText) return;

      const u = new SpeechSynthesisUtterance(cleanText);
      u.rate = 1.05;
      u.pitch = 0.95;

      // Select high quality UK or English Male voice if available (Stark AI accent)
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(
          (v) =>
            (v.lang === "en-GB" ||
              v.name.includes("United Kingdom") ||
              v.name.includes("George") ||
              v.name.includes("Oliver")) &&
            !v.name.includes("Female")
        ) ||
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("David") ||
              v.name.includes("Natural") ||
              v.name.includes("Male") ||
              v.name.includes("George"))
        ) ||
        voices.find((v) => v.lang.startsWith("en"));

      if (preferred) u.voice = preferred;

      window.speechSynthesis.speak(u);
      return;
    } catch {}
  }

  // Optional backend audio fallback
  try {
    const res = await fetch(`${API_BASE}/api/tts/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 300) }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
    }
  } catch {}
}

