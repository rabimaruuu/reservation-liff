console.log("script.js 読み込み OK");

// ===============================
// 設定
// ===============================
const API_URL = window.APP_CONFIG.API_URL;

const CALENDAR_IDS = {
  online: "5435128daa986e7c47f273f31fa5cd8063fa90171d838de5d9222f4a3b7c9dfa@group.calendar.google.com",
  offline: "227a3545d36419e11e531495bbfeca568bb2b4494052b01b4574adbc1973ea27@group.calendar.google.com"
};

let currentType = "online";
let userId = null;

// ===============================
// LIFF 初期化
// ===============================
async function initLIFF() {
  try {
    await liff.init({ liffId: "2009690638-qEYZlp9U" });

    if (!liff.isLoggedIn()) {
      liff.login();
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

  // 初期表示
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
        calendarId: CALENDAR_IDS[currentType]
      })
    });

    const data = await res.json();
    if (Array.isArray(data)) {
      renderSlots(data);
    } else {
      console.error("getSlots 応答異常:", data);
      alert("予約枠の取得に失敗しました");
    }
  } catch (e) {
    console.error(e);
    alert("予約枠の取得に失敗しました");
  }

  showLoading(false);
}

// ===============================
// 予約枠の表示
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
    const btn = document.createElement("button");
    btn.className = "slot-btn";
    btn.textContent =
      `${start.getMonth() + 1}/${start.getDate()} ` +
      `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}`;

    btn.onclick = () => openModal(ev);
    container.appendChild(btn);
  });
}

// ===============================
// モーダル表示
// ===============================
function openModal(event) {
  const modal = document.getElementById("confirm-modal");
  modal.style.display = "block";

  const dt = new Date(event.start.dateTime);
  const typeLabel = currentType === "online" ? "オンライン" : "対面";

  document.getElementById("confirm-text").textContent =
    `${typeLabel} / ${dt.toLocaleString()}`;

  document.getElementById("confirm-ok").onclick = () => reserve(event, currentType);
}

function closeModal() {
  document.getElementById("confirm-modal").style.display = "none";
}

document.getElementById("confirm-cancel").onclick = closeModal;

// ===============================
// 予約作成（予約枠削除 → 予約イベント作成）
// ===============================
async function reserve(event, type) {
  showLoading(true);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reserve",
        calendarId: CALENDAR_IDS[currentType],
        event,
        userId,
        type
      })
    });

    const data = await res.json();

    if (data.status === "success") {
      alert("予約が完了しました！");
      closeModal();
      loadSlots();
    } else {
      console.error("reserve 応答異常:", data);
      alert("予約に失敗しました");
    }
  } catch (e) {
    console.error(e);
    alert("通信エラーが発生しました");
  }

  showLoading(false);
}

// ===============================
// ローディング表示
// ===============================
function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
}
