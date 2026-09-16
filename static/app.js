/**
 * J.A.R.V.I.S. TACTICAL HOLOGRAPHIC HUD // CORE CLIENT ENGINE
 * Mark LXXXV Stark Operating System
 */

(function () {
  'use strict';

  // --- Tactical State ---
  const state = {
    core: 'online', // 'online' | 'thinking' | 'speaking' | 'listening' | 'offline'
    voiceEnabled: localStorage.getItem('jarvis_hud_voice') !== 'false',
    isProcessing: false,
    audioContext: null,
    currentAudio: null,
    recognition: null,
    fps: 60,
    latency: 24
  };

  // --- DOM References ---
  const chatFeed = document.getElementById('chatFeed');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');
  const typingIndicator = document.getElementById('typingIndicator');
  const hudStatusText = document.getElementById('hudStatusText');
  const coreBeacon = document.getElementById('coreBeacon');
  const hudClock = document.getElementById('hudClock');
  const voiceToggleBtn = document.getElementById('voiceToggleBtn');
  const voiceBtnText = document.getElementById('voiceBtnText');
  const voiceBeacon = document.getElementById('voiceBeacon');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const connectionToast = document.getElementById('connectionToast');
  const toastMessage = document.getElementById('toastMessage');
  const audioSpectrum = document.getElementById('audioSpectrum');
  const biometricPad = document.getElementById('biometricPad');
  const bioStatusBadge = document.getElementById('bioStatusBadge');
  const bioPrompt = document.getElementById('bioPrompt');
  const hexStreamBody = document.getElementById('hexStreamBody');
  const pingValue = document.getElementById('pingValue');
  const fpsValue = document.getElementById('fpsValue');

  // --- Web Audio Synthesizer for Sci-Fi Chirps ---
  function playHoloChirp(freq = 880, duration = 0.08, type = 'sine') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!state.audioContext) state.audioContext = new AudioCtx();
      if (state.audioContext.state === 'suspended') state.audioContext.resume();

      const osc = state.audioContext.createOscillator();
      const gain = state.audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, state.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, state.audioContext.currentTime + duration);

      gain.gain.setValueAtTime(0.04, state.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audioContext.currentTime + duration);

      osc.connect(gain);
      gain.connect(state.audioContext.destination);
      osc.start();
      osc.stop(state.audioContext.currentTime + duration);
    } catch (e) {}
  }

  // --- HUD Clock ---
  function initClock() {
    function update() {
      const now = new Date();
      const utc = now.toUTCString().split(' ')[4] + ' UTC';
      if (hudClock) hudClock.innerText = utc;
    }
    update();
    setInterval(update, 1000);
  }

  // --- Toast Notifications ---
  let toastTimer = null;
  function showToast(msg, duration = 4000) {
    if (!connectionToast || !toastMessage) return;
    toastMessage.innerText = msg;
    connectionToast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      connectionToast.classList.add('hidden');
    }, duration);
  }

  // --- HUD Status Updates ---
  function setCoreState(newState) {
    state.core = newState;
    if (!hudStatusText || !coreBeacon) return;

    switch (newState) {
      case 'thinking':
        hudStatusText.innerText = 'PROCESSING...';
        coreBeacon.className = 'beacon-led beacon-amber';
        break;
      case 'speaking':
        hudStatusText.innerText = 'VOCAL_OUT...';
        coreBeacon.className = 'beacon-led beacon-pulse-cyan';
        break;
      case 'listening':
        hudStatusText.innerText = 'LISTENING...';
        coreBeacon.className = 'beacon-led beacon-green';
        break;
      case 'offline':
        hudStatusText.innerText = 'LINK_OFFLINE';
        coreBeacon.className = 'beacon-led beacon-amber';
        break;
      case 'online':
      default:
        hudStatusText.innerText = 'SYS_ONLINE';
        coreBeacon.className = 'beacon-led beacon-pulse-cyan';
        break;
    }
  }

  // --- 3D Orbital Gyroscope Wireframe Canvas ---
  function initGyroscopeCanvas() {
    const canvas = document.getElementById('gyroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let angle = 0;

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      angle += state.core === 'speaking' ? 0.04 : 0.015;

      // Outer Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00F0FF';

      // Ring 1 (X-axis tilt)
      ctx.beginPath();
      ctx.ellipse(0, 0, 78, 78 * Math.cos(angle), angle, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 2 (Y-axis tilt)
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.6)';
      ctx.shadowColor = '#2563EB';
      ctx.beginPath();
      ctx.ellipse(0, 0, 60 * Math.sin(angle * 0.8), 60, angle * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 3 (Inner dashed orbit)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Central Pulsing Core
      const pulse = 10 + Math.sin(angle * 3) * 3;
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, pulse);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.5, '#00F0FF');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      requestAnimationFrame(render);
    }
    render();
  }

  // --- Dynamic Audio Spectrum Visualizer ---
  function initAudioSpectrum() {
    if (!audioSpectrum) return;
    const bars = audioSpectrum.querySelectorAll('.bar');

    setInterval(() => {
      bars.forEach((bar, idx) => {
        let mult = 1;
        if (state.core === 'speaking') mult = 3.5;
        else if (state.core === 'thinking') mult = 2.0;
        else if (state.core === 'listening') mult = 2.8;

        const base = Math.sin(Date.now() * 0.008 + idx * 0.45);
        const noise = Math.random() * 0.5;
        const height = Math.max(4, Math.min(24, Math.floor((base + 1.2 + noise) * 5 * mult)));
        bar.style.height = `${height}px`;
      });
    }, 60);
  }

  // --- Live Telemetry Jitter ---
  function initTelemetryJitter() {
    setInterval(() => {
      // Jitter latency between 21ms - 28ms
      const lat = Math.floor(21 + Math.random() * 8);
      if (pingValue) pingValue.innerText = `${lat}ms`;

      // Update hex memory stream
      if (hexStreamBody) {
        const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
        const codeEl = hexStreamBody.querySelector('code');
        if (codeEl) {
          const addr = '0x' + Math.floor(Math.random() * 65535).toString(16).padStart(4, '0').toUpperCase();
          codeEl.innerText = `${addr}  ${hex()} ${hex()} ${hex()} ${hex()} ${hex()} ${hex()} ${hex()}`;
        }
      }
    }, 2500);
  }

  // --- Biometric Scanner Interactive Flow ---
  function initBiometricScanner() {
    if (!biometricPad) return;
    biometricPad.addEventListener('click', () => {
      playHoloChirp(1200, 0.12);
      if (bioPrompt) bioPrompt.innerText = 'SCANNING FINGERPRINT...';
      if (bioStatusBadge) {
        bioStatusBadge.innerText = 'VERIFYING...';
        bioStatusBadge.className = 'badge-amber';
      }

      setTimeout(() => {
        playHoloChirp(1760, 0.18);
        if (bioPrompt) bioPrompt.innerText = 'IDENTITY VERIFIED: TONY STARK';
        if (bioStatusBadge) {
          bioStatusBadge.innerText = 'CLEARANCE 10';
          bioStatusBadge.className = 'badge-green';
        }
        showToast('BIOMETRIC SECURITY CHECK: ACCESS GRANTED [TONY STARK]');
      }, 1000);
    });
  }

  // --- Markdown Parser ---
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderMarkdown(raw) {
    if (!raw) return '';
    let text = raw;

    // Code blocks with copy button
    text = text.replace(/```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const displayLang = lang.trim() || 'COMMAND_SCRIPT';
      const escapedCode = escapeHtml(code.trim());
      return `<div class="hud-code-container">
        <div class="hud-code-bar">
          <span>// ${displayLang.toUpperCase()}</span>
          <button class="meta-btn" onclick="copySnippet(this)">COPY</button>
        </div>
        <pre><code>${escapedCode}</code></pre>
      </div>`;
    });

    // Inline code
    text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Headers
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold / Italics
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Lists
    text = text.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Paragraphs
    const lines = text.split('\n');
    let out = '';
    for (let l of lines) {
      l = l.trim();
      if (!l) continue;
      if (l.startsWith('<div') || l.startsWith('<h') || l.startsWith('<ul') || l.startsWith('<li')) {
        out += l;
      } else {
        out += `<p>${l}</p>`;
      }
    }
    return out || `<p>${escapeHtml(raw)}</p>`;
  }

  window.copySnippet = function (btn) {
    const code = btn.closest('.hud-code-container')?.querySelector('pre code');
    if (!code) return;
    navigator.clipboard.writeText(code.innerText).then(() => {
      btn.innerText = 'COPIED';
      setTimeout(() => { btn.innerText = 'COPY'; }, 1800);
    });
  };

  // --- Chat Message Management ---
  function appendMessage(text, role = 'ai', rawTime = null) {
    const timeStr = rawTime
      ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const row = document.createElement('div');
    row.className = `hud-chat-row ${role === 'user' ? 'user-row' : 'ai-row'}`;

    if (role === 'user') {
      row.innerHTML = `
        <div class="hud-msg-card">
          <div class="hud-msg-content">${escapeHtml(text)}</div>
          <div class="hud-msg-meta">
            <span>TRANSMISSION // ${timeStr}</span>
          </div>
        </div>
      `;
    } else {
      const rendered = renderMarkdown(text);
      row.innerHTML = `
        <div class="hud-msg-card">
          <div class="hud-msg-content">${rendered}</div>
          <div class="hud-msg-meta">
            <span>J.A.R.V.I.S. // ${timeStr}</span>
            <div class="meta-btn-group">
              <button class="meta-btn" onclick="copyCardText(this)">COPY</button>
              <button class="meta-btn" onclick="speakCardText(this)">VOCAL</button>
            </div>
          </div>
        </div>
      `;
    }

    chatFeed.appendChild(row);
    scrollToBottom();
    return row;
  }

  window.copyCardText = function (btn) {
    const content = btn.closest('.hud-msg-card')?.querySelector('.hud-msg-content');
    if (!content) return;
    navigator.clipboard.writeText(content.innerText).then(() => {
      btn.innerText = 'COPIED';
      setTimeout(() => { btn.innerText = 'COPY'; }, 1600);
    });
  };

  window.speakCardText = function (btn) {
    const content = btn.closest('.hud-msg-card')?.querySelector('.hud-msg-content');
    if (!content) return;
    speakVoice(content.innerText);
  };

  function scrollToBottom() {
    if (chatFeed) {
      chatFeed.scrollTo({ top: chatFeed.scrollHeight, behavior: 'smooth' });
    }
  }

  // --- Vocal Output Synthesis (TTS) ---
  let availableVoices = [];
  function loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      availableVoices = window.speechSynthesis.getVoices();
    }
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  function cleanTextForSpeech(raw) {
    if (!raw) return '';
    return raw
      .replace(/```[\s\S]*?```/g, 'Code sequence generated, sir.')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\/\/ PROTOCOL EXECUTED:.*$/gm, '')
      .replace(/[*_#`~>]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 380);
  }

  async function speakVoice(text) {
    if (!state.voiceEnabled || !text) return;

    if (state.currentAudio) {
      try { state.currentAudio.pause(); } catch (e) {}
      state.currentAudio = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    setCoreState('speaking');

    // 1. Try server audio synthesis
    try {
      const res = await fetch('/api/tts/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 450) })
      });

      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('audio')) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          state.currentAudio = audio;
          audio.onended = () => {
            setCoreState('online');
            state.currentAudio = null;
            checkHandsFreeReArm();
          };
          audio.onerror = () => speakBrowserSpeech(text);
          await audio.play();
          return;
        }
      }
    } catch (e) {}

    // 2. Client Web Speech API fallback with clean text & British JARVIS voice
    speakBrowserSpeech(text);
  }

  function speakBrowserSpeech(text) {
    if (!('speechSynthesis' in window)) {
      setCoreState('online');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const clean = cleanTextForSpeech(text);
      if (!clean) {
        setCoreState('online');
        return;
      }
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.05;
      u.pitch = 0.95;

      if (availableVoices.length === 0) loadVoices();
      const pref = availableVoices.find(v => (v.lang === 'en-GB' || v.name.includes('United Kingdom') || v.name.includes('George') || v.name.includes('Oliver')) && !v.name.includes('Female'))
        || availableVoices.find(v => v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('Natural') || v.name.includes('Male')))
        || availableVoices.find(v => v.lang.startsWith('en'));
      if (pref) u.voice = pref;

      u.onend = () => {
        setCoreState('online');
        checkHandsFreeReArm();
      };
      u.onerror = () => setCoreState('online');
      window.speechSynthesis.speak(u);
    } catch (e) {
      setCoreState('online');
    }
  }

  function checkHandsFreeReArm() {
    if (state.handsFreeMode && state.recognition && !state.isProcessing && !state.isListening) {
      setTimeout(() => {
        if (!state.isListening && !state.isProcessing) {
          try {
            state.recognition.start();
          } catch (e) {}
        }
      }, 700);
    }
  }

  // --- Voice Input (STT) ---
  function initSpeechRec() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      if (micBtn) micBtn.title = 'Speech-to-Text unavailable in browser';
      return;
    }
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      state.isListening = true;
      micBtn.classList.add('recording');
      setCoreState('listening');
      playHoloChirp(900, 0.08);
      showToast('VOCAL LINK ENGAGED // LISTENING...');
    };

    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      const current = (final || interim).trim();
      state.transcript = current;
      if (current) {
        userInput.value = current;
        updateInputState();
      }
    };

    rec.onerror = (e) => {
      state.isListening = false;
      micBtn.classList.remove('recording');
      setCoreState('online');

      if (e.error === 'network') {
        showToast('VOICE ERROR: In Brave browser, enable Google Speech Services in brave://settings/privacy');
      } else if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        showToast('MIC PERMISSION DENIED: Please allow microphone access in browser address bar.');
      } else if (e.error === 'no-speech') {
        // Soft timeout when user was quiet
      }
    };

    rec.onend = () => {
      state.isListening = false;
      micBtn.classList.remove('recording');
      setCoreState('online');

      const query = (state.transcript || userInput.value).trim();
      state.transcript = '';
      if (query) {
        playHoloChirp(1400, 0.08);
        userInput.value = '';
        updateInputState();
        executeCommand(query);
      }
    };

    state.recognition = rec;
  }

  // --- Execute Tactical Command Flow ---
  async function executeCommand(customPrompt) {
    const prompt = (customPrompt || userInput.value).trim();
    if (!prompt || state.isProcessing) return;

    playHoloChirp(600, 0.06);
    state.isProcessing = true;
    userInput.value = '';
    updateInputState();

    appendMessage(prompt, 'user');
    setCoreState('thinking');
    if (typingIndicator) typingIndicator.classList.remove('hidden');
    scrollToBottom();

    let fullResponse = '';
    let msgRow = null;
    let capturedAction = null;
    let tabOpened = false;

    try {
      // 1. Attempt Streaming SSE
      const streamRes = await fetch('/api/llm/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, max_tokens: 250 })
      });

      if (streamRes.ok && streamRes.body) {
        if (typingIndicator) typingIndicator.classList.add('hidden');
        msgRow = appendMessage('', 'ai');
        const contentEl = msgRow.querySelector('.hud-msg-content');

        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const parts = chunk.split('\n\n');

          for (const part of parts) {
            if (!part.trim()) continue;
            const m = part.match(/^data:\s*(.*)$/s);
            if (m) {
              try {
                const data = JSON.parse(m[1]);
                if (data.action) {
                  capturedAction = data.action;
                  if (!tabOpened) {
                    tabOpened = true;
                    playHoloChirp(1200, 0.12);
                    showToast('PROTOCOL ENGAGED: ' + (data.action.target || data.action.type || 'EXECUTE').toUpperCase());
                    if (data.action.url) {
                      try { window.open(data.action.url, '_blank'); } catch (e) {}
                    }
                  }
                }
                if (data.delta) {
                  fullResponse += data.delta;
                  contentEl.innerHTML = renderMarkdown(fullResponse);
                  scrollToBottom();
                }
                if (data.done && data.full) {
                  fullResponse = data.full;
                  let html = renderMarkdown(fullResponse);
                  if (capturedAction) {
                    const label = (capturedAction.target || capturedAction.type || 'SYSTEM').toUpperCase();
                    const dest = capturedAction.dest || capturedAction.url || 'Host Command Executed';
                    html += `<div class="hud-action-banner">
                      <div class="action-info">
                        <span class="beacon-led beacon-green"></span>
                        <div>
                          <strong>// PROTOCOL EXECUTED: ${label}</strong>
                          <div style="font-size: 9.5px; opacity: 0.75;">${dest}</div>
                        </div>
                      </div>
                      ${capturedAction.url ? `<a href="${capturedAction.url}" target="_blank" rel="noopener noreferrer" class="meta-btn action-btn">LAUNCH DESTINATION &#x2197;</a>` : '<span class="badge-green" style="font-size:10px; padding:2px 6px;">[ACTIVE ON HOST OS]</span>'}
                    </div>`;
                  }
                  contentEl.innerHTML = html;
                }
              } catch (e) {}
            }
          }
        }
      } else {
        throw new Error('Stream unavailable');
      }
    } catch (streamErr) {
      // 2. Fallback to standard /api/llm
      try {
        const res = await fetch('/api/llm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, max_tokens: 250 })
        });
        const json = await res.json();
        fullResponse = json.text || 'Command processed.';
        if (json.action) {
          capturedAction = json.action;
          if (!tabOpened) {
            tabOpened = true;
            playHoloChirp(1200, 0.12);
            showToast('PROTOCOL ENGAGED: ' + (json.action.target || json.action.type || 'EXECUTE').toUpperCase());
            if (json.action.url) {
              try { window.open(json.action.url, '_blank'); } catch (e) {}
            }
          }
        }

        let html = renderMarkdown(fullResponse);
        if (capturedAction) {
          const label = (capturedAction.target || capturedAction.type || 'SYSTEM').toUpperCase();
          const dest = capturedAction.dest || capturedAction.url || 'Host Command Executed';
          html += `<div class="hud-action-banner">
            <div class="action-info">
              <span class="beacon-led beacon-green"></span>
              <div>
                <strong>// PROTOCOL EXECUTED: ${label}</strong>
                <div style="font-size: 9.5px; opacity: 0.75;">${dest}</div>
              </div>
            </div>
            ${capturedAction.url ? `<a href="${capturedAction.url}" target="_blank" rel="noopener noreferrer" class="meta-btn action-btn">LAUNCH DESTINATION &#x2197;</a>` : '<span class="badge-green" style="font-size:10px; padding:2px 6px;">[ACTIVE ON HOST OS]</span>'}
          </div>`;
        }

        if (!msgRow) {
          msgRow = appendMessage('', 'ai');
        }
        msgRow.querySelector('.hud-msg-content').innerHTML = html;
      } catch (err) {
        showToast('NEURAL LINK DISCONNECTED: CHECK PORT 8000');
        setCoreState('offline');
        appendMessage('Neural link failure: unable to reach J.A.R.V.I.S. core on http://127.0.0.1:8000.', 'ai');
        state.isProcessing = false;
        if (typingIndicator) typingIndicator.classList.add('hidden');
        return;
      }
    } finally {
      if (typingIndicator) typingIndicator.classList.add('hidden');
      state.isProcessing = false;
      setCoreState('online');
      scrollToBottom();
    }

    if (fullResponse) {
      speakVoice(fullResponse);
    }
  }

  // --- Input State & Textarea Auto-growth ---
  function updateInputState() {
    const val = userInput.value.trim();
    sendBtn.disabled = !val || state.isProcessing;
    userInput.style.height = 'auto';
    userInput.style.height = `${Math.min(userInput.scrollHeight, 120)}px`;
  }

  // --- Load Initial Telemetry & History ---
  async function loadInitialData() {
    // 1. Health check
    try {
      const res = await fetch('/api/health');
      if (res.ok) setCoreState('online');
      else setCoreState('offline');
    } catch (e) {
      setCoreState('offline');
      showToast('JARVIS SERVER OFFLINE &bull; START RUNNER AT 127.0.0.1:8000');
    }

    // 2. Load conversation history
    try {
      const hRes = await fetch('/api/history?limit=25');
      if (hRes.ok) {
        const data = await hRes.json();
        const items = data.items || [];
        items.forEach(msg => {
          const role = (msg.role === 'assistant' || msg.role === 'model') ? 'ai' : 'user';
          appendMessage(msg.content, role, msg.ts);
        });
      }
    } catch (e) {}
  }

  // --- Event Bindings ---
  function bindEvents() {
    userInput.addEventListener('input', updateInputState);
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        executeCommand();
      }
    });

    sendBtn.addEventListener('click', () => executeCommand());

    // Mic Trigger
    if (micBtn) {
      micBtn.addEventListener('click', async () => {
        if (!state.recognition) {
          showToast('VOICE RECOGNITION NOT SUPPORTED IN THIS BROWSER');
          return;
        }
        if (state.isListening) {
          try { state.recognition.stop(); } catch (e) {}
        } else {
          try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach(t => t.stop());
            }
          } catch (err) {
            if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
              showToast('MIC PERMISSION BLOCKED: Allow microphone access in address bar.');
              return;
            }
          }

          try {
            state.transcript = '';
            userInput.value = '';
            state.recognition.start();
          } catch (e) {
            try {
              state.recognition.stop();
              setTimeout(() => state.recognition?.start(), 150);
            } catch (err) {}
          }
        }
      });
    }

    // Voice Toggle
    voiceToggleBtn.addEventListener('click', () => {
      state.voiceEnabled = !state.voiceEnabled;
      localStorage.setItem('jarvis_hud_voice', state.voiceEnabled);
      playHoloChirp(state.voiceEnabled ? 1100 : 440, 0.08);
      if (state.voiceEnabled) {
        voiceBtnText.innerText = 'VOCAL: ON';
        voiceBeacon.className = 'beacon-led beacon-green';
      } else {
        voiceBtnText.innerText = 'VOCAL: MUTED';
        voiceBeacon.className = 'beacon-led beacon-amber';
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (state.currentAudio) state.currentAudio.pause();
      }
    });

    // Clear Chat
    clearChatBtn.addEventListener('click', async () => {
      playHoloChirp(400, 0.1, 'sawtooth');
      if (!confirm('CONFIRM FLUSH: Wipe all JARVIS memory cores?')) return;
      try { await fetch('/api/clear', { method: 'POST' }); } catch (e) {}
      chatFeed.innerHTML = '';
      showToast('MEMORY CORE FLUSHED // READY');
    });

    // Tactical Protocol Cards
    document.querySelectorAll('.tactical-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt) executeCommand(prompt);
      });
    });

    // Emergency Override button
    const overrideBtn = document.getElementById('protocolOverrideBtn');
    if (overrideBtn) {
      overrideBtn.addEventListener('click', () => {
        playHoloChirp(1500, 0.2, 'sawtooth');
        showToast('SYSTEM OVERRIDE ENGAGED // MARK LXXXV COMBAT READY');
        executeCommand('Engage protocol override. Confirm status of all thrusters, arc reactor power output, and tactical defense arrays.');
      });
    }

    // Lockdown button
    const lockdownBtn = document.getElementById('protocolLockdownBtn');
    if (lockdownBtn) {
      lockdownBtn.addEventListener('click', () => {
        playHoloChirp(300, 0.2, 'sawtooth');
        showToast('FACILITY LOCKDOWN INITIALIZED // PROTOCOL VERITAS');
        executeCommand('Initiate facility perimeter security lockdown protocol.');
      });
    }
  }

  // --- Bootstrap ---
  function init() {
    initClock();
    initGyroscopeCanvas();
    initAudioSpectrum();
    initTelemetryJitter();
    initBiometricScanner();
    initSpeechRec();
    bindEvents();
    loadInitialData();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
