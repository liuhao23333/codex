const DURATIONS = {
  focus: 25 * 60,
  break: 5 * 60,
};

const sessionNames = {
  focus: "专注",
  break: "休息",
};

const state = {
  session: "focus",
  remainingSeconds: DURATIONS.focus,
  isRunning: false,
  intervalId: null,
};

const timeDisplay = document.getElementById("time-display");
const sessionLabel = document.getElementById("session-label");
const toggleBtn = document.getElementById("toggle-btn");
const resetBtn = document.getElementById("reset-btn");
const sessionButtons = document.querySelectorAll(".session-button");

let audioContext = null;

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateDocumentTitle() {
  const label = sessionNames[state.session];
  document.title = `${formatTime(state.remainingSeconds)} · ${label}`;
}

function updateSessionButtons() {
  sessionButtons.forEach((button) => {
    const isActive = button.dataset.session === state.session;
    button.classList.toggle("active", isActive);
  });
}

function updateUI() {
  const label = sessionNames[state.session];
  sessionLabel.textContent = `当前：${label}`;
  timeDisplay.textContent = formatTime(state.remainingSeconds);
  toggleBtn.textContent = state.isRunning ? "暂停" : "开始";
  document.body.classList.toggle("break", state.session === "break");
  updateSessionButtons();
  updateDocumentTitle();
}

function stopTimer() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isRunning = false;
  updateUI();
}

function startTimer() {
  if (state.isRunning) {
    return;
  }
  state.isRunning = true;
  state.intervalId = setInterval(() => {
    state.remainingSeconds -= 1;
    if (state.remainingSeconds <= 0) {
      handleSessionComplete();
      return;
    }
    updateUI();
  }, 1000);
  updateUI();
}

function setSession(session, opt = { reset: true }) {
  const shouldReset = opt.reset !== false;
  stopTimer();
  state.session = session;
  if (shouldReset) {
    state.remainingSeconds = DURATIONS[session];
  }
  updateUI();
}

function resetSession() {
  stopTimer();
  state.remainingSeconds = DURATIONS[state.session];
  updateUI();
}

function nextSession() {
  return state.session === "focus" ? "break" : "focus";
}

function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return;
    }
    if (!audioContext) {
      audioContext = new Ctx();
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = state.session === "focus" ? 880 : 660;

    gain.gain.setValueAtTime(0.0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.7);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.8);
  } catch (err) {
    console.warn("Unable to play notification sound", err);
  }
}

function notifyCompletion() {
  playChime();
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(`${sessionNames[state.session]}结束`, {
        body: "自动切换到下一阶段",
      });
    } else if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
}

function handleSessionComplete() {
  notifyCompletion();
  const upcoming = nextSession();
  setSession(upcoming);
  startTimer();
}

function toggleTimer() {
  if (state.isRunning) {
    stopTimer();
  } else {
    startTimer();
  }
}

toggleBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetSession);

sessionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetSession = button.dataset.session;
    if (targetSession === state.session) {
      return;
    }
    setSession(targetSession);
  });
});

updateUI();
