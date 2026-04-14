console.log("script.js 読み込み OK");

// ===============================
// 設定
// ===============================
const API_URL = window.APP_CONFIG.API_URL;

// 予約枠カレンダー（空き枠台帳）
const SLOT_CALENDAR_ID =
  "0ecbe769b531bfb9c87a4633763a3e4f9832e0b108fe0955b175b978f7493370@group.calendar.google.com";

let currentType = "online";
let userId = null;

// ===============================
// LIFF 初期化
// ===============================
async function initLIFF() {
  try {
    await liff.init({ liffId: "2009777389-GQo5v4s4" });

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
      return;
    }

    const profile = await liff.getProfile();
    userId = profile.userId;

    setupTabs();
    loadSlots();
  } catch (e) {
    console.error("LIFF 初期化エラー:", e);
  }
}
document.addEventListener("DOMContentLoaded", initLIFF);

// ===============================
// タブ切り替え
// ===============================
function setupTabs() {
  const tabOnline = document.getElementById("tab-online");
  const tabOffline = document.getElementById("tab-offline");
  const title = document.getElementById("slot-title");

  tabOnline.addEventListener("click", () => {
    currentType = "online";
    tabOnline.classList.add("active");
    tabOffline.classList.remove("active");
    title.textContent = "オンラインの空き枠";
    loadSlots();
  });

  tabOffline.addEventListener("click", () => {
    currentType = "offline";
    tabOffline.classList.add("active");
    tabOnline.classList.remove("active");
    title.textContent = "対面の空き枠";
    loadSlots();
  });

  title.textContent = "オンラインの空き枠";
}

// ===============================
// 予約枠取得
// ===============================
async function loadSlots() {
  showLoading(true);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getSlots",
        calendarId: SLOT_CALENDAR_ID
      })
    });

    const data = await res.json();
    renderSlots(data);
  } catch (e) {
    console.error(e);
    alert("予約枠の取得に失敗しました");
  }

  showLoading(false);
}

// ===============================
// 予約枠表示
// ===============================
function renderSlots(events) {
  const container = document.getElementById("slots");
  container.innerHTML = "";

  if (!events || events.length === 0) {
    container.innerHTML = "<p>予約枠がありません</p>";
    return;
  }

  events.forEach(ev => {
    if (!ev.start || !ev.start.dateTime) return;

    const start = new Date(ev.start.dateTime);
    const end = new Date(ev.end.dateTime);

    const btn = document.createElement("button");
    btn.className = "slot-btn";
    btn.textContent =
      `${start.getMonth() + 1}/${start.getDate()} ` +
      `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}〜` +
      `${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`;

    btn.onclick = () => openModal(ev);
    container.appendChild(btn);
  });
}

// ===============================
// 30分刻みの時間リスト生成
// ===============================
function generateTimeSlots(startDate, endDate) {
  const slots = [];
  let current = new Date(startDate);

  while (current < endDate) {
    slots.push(new Date(current));
    current = new Date(current.getTime() + 30 * 60 * 1000);
  }

  return slots;
}

// ===============================
// モーダル表示（開始/終了選択）
// ===============================
function openModal(event) {
  const modal = document.getElementById("confirm-modal");
  modal.style.display = "block";

  const start = new Date(event.start.dateTime);
  const end = new Date(event.end.dateTime);

  const typeLabel = currentType === "online" ? "オンライン" : "対面";
  document.getElementById("confirm-text").textContent =
    `${typeLabel} / ${start.toLocaleString()}〜${end.toLocaleString()}`;

  const slots = generateTimeSlots(start, end);

  const startSelect = document.getElementById("start-time");
  const endSelect = document.getElementById("end-time");

  startSelect.innerHTML = "";
  endSelect.innerHTML = "";

  // 開始時間
  slots.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.toISOString();
    opt.textContent = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    startSelect.appendChild(opt);
  });

  // 終了時間（開始より後のみ）
  startSelect.onchange = () => {
    const selectedStart = new Date(startSelect.value);
    endSelect.innerHTML = "";

    slots.forEach(s => {
      if (s > selectedStart) {
        const opt = document.createElement("option");
        opt.value = s.toISOString();
        opt.textContent = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        endSelect.appendChild(opt);
      }
    });
  };

  startSelect.dispatchEvent(new Event("change"));

  document.getElementById("confirm-ok").onclick = () => {
    reserve(event, currentType, startSelect.value, endSelect.value);
  };
}

function closeModal() {
  document.getElementById("confirm-modal").style.display = "none";
}
document.getElementById("confirm-cancel").onclick = closeModal;

// ===============================
// 予約作成
// ===============================
async function reserve(event, type, startTime, endTime) {
  showLoading(true);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reserve",
        userId,
        type,
        start: startTime,
        end: endTime
      })
    });

    const data = await res.json();

    if (data.status === "success") {
      alert("予約が完了しました！");
      closeModal();
      loadSlots();
    } else if (data.message === "already_reserved") {
      alert("すみません、この時間帯はすでに予約があります。");
      closeModal();
      loadSlots();
    } else {
      alert("予約に失敗しました");
    }
  } catch (e) {
    console.error(e);
    alert("通信エラーが発生しました");
  }

  showLoading(false);
}

// ===============================
// ローディング
// ===============================
function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
}
