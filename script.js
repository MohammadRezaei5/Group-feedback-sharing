// variables
const teamMembers = [
  "علی",
  "حسین",
  "محمد",
  "پدرام",
  "زهرا",
  "نادیا",
  "فاطمه",
  "مهناز",
];
const targetTimestamp = new Date("2026-08-25T18:25:00").getTime();
const STORAGE_KEY = "group_feedback_lottery_results_v1";

let soundEnabled = false;
let countdownInterval = null;
let isDrawStarted = false;
let audioCtx = null;
let finalPairsList = [];

// DOM Elements
const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const membersChipsContainer = document.getElementById(
  "members-chips-container",
);
const membersCountBadge = document.getElementById("members-count-badge");
const countdownCard = document.getElementById("countdown-card");
const membersSection = document.getElementById("members-section");
const drawStage = document.getElementById("draw-stage");
const slotP1 = document.getElementById("slot-p1");
const slotP2 = document.getElementById("slot-p2");
const drawStatusText = document.getElementById("draw-status-text");
const resultsSection = document.getElementById("results-section");
const resultsGrid = document.getElementById("results-grid");
const oddMemberContainer = document.getElementById("odd-member-container");
const executionTimestampBadge = document.getElementById(
  "execution-timestamp-badge",
);
const executionTimestampText = document.getElementById(
  "execution-timestamp-text",
);
const btnToggleSound = document.getElementById("btn-toggle-sound");
const soundIcon = document.getElementById("sound-icon");
const soundText = document.getElementById("sound-text");
const btnCopyResults = document.getElementById("btn-copy-results");
// functions and listener
function checkAndLoadSavedResults() {
  try {
    const savedDataStr = localStorage.getItem(STORAGE_KEY);
    if (savedDataStr) {
      const data = JSON.parse(savedDataStr);
      // بررسی انطباق زمان تعیین‌شده فعلی با زمان ذخیره‌شده در نتایج قبلی
      if (
        data &&
        data.targetTimestamp === targetTimestamp &&
        data.pairs &&
        data.pairs.length > 0
      ) {
        displaySavedResults(data);
        return true;
      } else if (data && data.targetTimestamp !== targetTimestamp) {
        // در صورت تغییر تاریخ یا زمان در کد، نتایج مربوط به تاریخ قبلی پاک می‌شوند
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch (e) {
    console.warn("Error reading results from localStorage:", e);
  }
  return false;
}
function saveResultsToStorage(pairs, oddMember, formattedDateStr) {
  try {
    const data = {
      targetTimestamp: targetTimestamp,
      pairs: pairs,
      oddMember: oddMember || null,
      timestamp: Date.now(),
      formattedDate: formattedDateStr,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Error saving results to localStorage:", e);
  }
}
function displaySavedResults(data) {
  isDrawStarted = true;
  if (countdownInterval) clearInterval(countdownInterval);

  countdownCard.style.display = "none";
  membersSection.style.display = "none";
  drawStage.style.display = "none";
  resultsSection.style.display = "flex";

  finalPairsList = data.pairs || [];
  resultsGrid.innerHTML = "";
  oddMemberContainer.innerHTML = "";

  finalPairsList.forEach((pair, idx) => {
    appendPairResultCard(idx + 1, pair.p1, pair.p2);
  });

  if (data.oddMember) {
    appendOddMemberCard(data.oddMember);
  }

  if (data.formattedDate) {
    executionTimestampText.textContent = `تاریخ و ساعت برگزاری: ${data.formattedDate}`;
    executionTimestampBadge.style.display = "inline-block";
  }
}
function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}
btnToggleSound.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    initAudio();
    soundIcon.textContent = "🔊";
    soundText.textContent = "صدا: روشن";
  } else {
    soundIcon.textContent = "🔇";
    soundText.textContent = "صدا: خاموش";
  }
});
function playSound(type) {
  if (!soundEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    if (type === "tick") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === "reveal") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "fanfare") {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const noteTime = now + idx * 0.1;
        gain.gain.setValueAtTime(0.2, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.3);
      });
    }
  } catch (e) {
    console.warn("Audio playback suppressed", e);
  }
}
function renderInitialMembers() {
  membersCountBadge.textContent = `(${teamMembers.length} نفر)`;
  membersChipsContainer.innerHTML = "";
  teamMembers.forEach((name) => {
    const chip = document.createElement("div");
    chip.className = "member-pill";
    chip.innerHTML = `
                    <span class="member-avatar">👤</span>
                    <span>${escapeHtml(name)}</span>
                `;
    membersChipsContainer.appendChild(chip);
  });
}
function updateTimer() {
  const now = new Date().getTime();
  const diff = targetTimestamp - now;

  if (diff <= 0) {
    clearInterval(countdownInterval);
    daysEl.textContent = "00";
    hoursEl.textContent = "00";
    minutesEl.textContent = "00";
    secondsEl.textContent = "00";

    if (!isDrawStarted) {
      startLotteryProcess();
    }
    return;
  }

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  daysEl.textContent = String(d).padStart(2, "0");
  hoursEl.textContent = String(h).padStart(2, "0");
  minutesEl.textContent = String(m).padStart(2, "0");
  secondsEl.textContent = String(s).padStart(2, "0");
}
function fisherYatesShuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
async function startLotteryProcess() {
  isDrawStarted = true;
  countdownCard.style.display = "none";
  membersSection.style.display = "none";
  drawStage.style.display = "flex";

  const shuffled = fisherYatesShuffle(teamMembers);
  const pairs = [];
  let oddMember = null;

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push([shuffled[i], shuffled[i + 1]]);
    } else {
      oddMember = shuffled[i];
    }
  }

  finalPairsList = [];
  resultsGrid.innerHTML = "";
  oddMemberContainer.innerHTML = "";

  // Sequentially reveal each pair
  for (let index = 0; index < pairs.length; index++) {
    const [p1, p2] = pairs[index];
    drawStatusText.textContent = `در حال قرعه‌کشی همراه فیدبک ${index + 1} از ${pairs.length}`;

    await spinSlotsForPair(p1, p2);

    finalPairsList.push({ p1, p2 });
    appendPairResultCard(index + 1, p1, p2);

    await sleep(1500);
  }

  // Handle odd member if present
  if (oddMember) {
    drawStatusText.textContent = `تعیین وضعیت عضو باقی‌مانده...`;
    slotP1.classList.add("revealed");
    slotP2.classList.add("revealed");
    slotP1.textContent = oddMember;
    slotP2.textContent = "هماهنگ‌کننده";
    playSound("reveal");

    appendOddMemberCard(oddMember);
    await sleep(1500);
  }

  // Format timestamp for display and local storage
  const executionDateObj = new Date();
  const formattedDateStr = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(executionDateObj);

  executionTimestampText.textContent = `تاریخ و ساعت برگزاری: ${formattedDateStr}`;
  executionTimestampBadge.style.display = "inline-block";

  // Save results to local storage
  saveResultsToStorage(finalPairsList, oddMember, formattedDateStr);

  // Completion phase
  drawStage.style.display = "none";
  resultsSection.style.display = "flex";
  playSound("fanfare");
  launchConfetti();
}
function spinSlotsForPair(finalP1, finalP2) {
  return new Promise((resolve) => {
    slotP1.classList.remove("revealed");
    slotP2.classList.remove("revealed");
    slotP1.classList.add("spinning");
    slotP2.classList.add("spinning");

    const interval = setInterval(() => {
      slotP1.textContent =
        teamMembers[Math.floor(Math.random() * teamMembers.length)];
      slotP2.textContent =
        teamMembers[Math.floor(Math.random() * teamMembers.length)];
      playSound("tick");
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      slotP1.classList.remove("spinning");
      slotP2.classList.remove("spinning");

      slotP1.classList.add("revealed");
      slotP2.classList.add("revealed");

      slotP1.textContent = finalP1;
      slotP2.textContent = finalP2;
      playSound("reveal");

      resolve();
    }, 1600);
  });
}
function appendPairResultCard(pairNum, p1, p2) {
  const card = document.createElement("div");
  card.className = "pair-card";
  card.innerHTML = `
                <div class="pair-person">${escapeHtml(p1)}</div>
                <div class="pair-separator">🤝</div>
                <div class="pair-person">${escapeHtml(p2)}</div>
            `;
  resultsGrid.appendChild(card);
}
function appendOddMemberCard(name) {
  const card = document.createElement("div");
  card.className = "odd-person-card";
  card.innerHTML = `
                <div class="tag">⭐ عضو بدون همراه فیدبک</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: #92400e; margin-top: 0.25rem;">
                    <strong>${escapeHtml(name)}</strong> به‌عنوان هماهنگ‌کننده و پشتیبان گروه انتخاب شد.
                </div>
            `;
  oddMemberContainer.appendChild(card);
}
btnCopyResults.addEventListener("click", () => {
  if (finalPairsList.length === 0) return;

  let text = " نتایج تقسیم فیدبک گروهی \n\n";
  if (executionTimestampText.textContent) {
    text += `📅 ${executionTimestampText.textContent}\n\n`;
  }

  finalPairsList.forEach((pair, idx) => {
    text += `همراه فیدبک ${idx + 1}: ${pair.p1} 🤝 ${pair.p2}\n`;
  });

  const oddCard = oddMemberContainer.querySelector("strong");
  if (oddCard) {
    text += `\n⭐ هماهنگ‌کننده گروه: ${oddCard.textContent}`;
  }

  copyToClipboard(text);

  const originalText = btnCopyResults.innerHTML;
  btnCopyResults.innerHTML = "<span>✅</span><span>کپی شد!</span>";
  setTimeout(() => {
    btnCopyResults.innerHTML = originalText;
  }, 2000);
});
function copyToClipboard(str) {
  const el = document.createElement("textarea");
  el.value = str;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}
function launchConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

  for (let i = 0; i < 120; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: Math.random() * 3 + 2,
      vx: Math.random() * 2 - 1,
      rot: Math.random() * 360,
      rotSpeed: Math.random() * 10 - 5,
    });
  }

  let animationFrame;
  const startTime = Date.now();

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.y += p.vy;
      p.x += p.vx;
      p.rot += p.rotSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    if (Date.now() - startTime < 4500) {
      animationFrame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  draw();
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m];
  });
}
window.addEventListener("DOMContentLoaded", () => {
  renderInitialMembers();

  // Check if results were already saved in Local Storage
  const hasSavedResults = checkAndLoadSavedResults();

  // If no prior saved results, initialize live countdown
  if (!hasSavedResults) {
    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
  }
});
window.addEventListener("resize", () => {
  const canvas = document.getElementById("confetti-canvas");
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});
