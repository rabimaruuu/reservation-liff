console.log("script.js 読み込み OK");

// ===============================
// 設定
// ===============================
const API_URL = window.APP_CONFIG.API_URL;

// 予約枠カレンダー（空き枠台帳）
const SLOT_CALENDAR_ID =
  "0ecbe769b531bfb9c87a4633763a3e4f9832e0b108fe0955b175b978f7493370@group.calendar.google.com";

// オンライン / 対面の区別（予約イベント用）
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

  title.textContent = "オンラインの空き枠";
}

// ===============================
// 予約枠取得（枠カレンダーのみ）
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

  document.get
