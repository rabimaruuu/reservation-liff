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
  await liff.init({ liffId: "2009690638-qEYZlp9U" });

  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  const profile = await liff.getProfile();
  userId = profile.userId;

  loadSlots();
}

document.addEventListener("DOMContentLoaded", initLIFF);

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
    renderSlots(data);
  } catch (e) {
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
    const start = new Date(ev.start.dateTime);
    const btn = document.createElement("button");
    btn.className = "slot-btn";
    btn.textContent = `${start.getMonth() + 1}/${start.getDate()} ${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}`;
    btn.onclick = () => openModal(ev);
    container.appendChild(btn);
  });
}

// ===============================
// モーダル表示
// ===============================
function openModal(event) {
  const modal = document.getElementById("modal");
  modal.style.display = "block";

  document.getElementById("modal-date").textContent =
    new Date(event.start.dateTime).toLocaleString();

  document.getElementById("confirm-btn").onclick = () => reserve(event);
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// ===============================
// 予約作成
// ===============================
async function reserve(event) {
  showLoading(true);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reserve",
        calendarId: CALENDAR_IDS[currentType],
        event,
        userId
      })
    });

    const data = await res.json();

    if (data.status === "success") {
      alert("予約が完了しました！");
      closeModal();
      loadSlots();
    } else {
      alert("予約に失敗しました");
    }
  } catch (e) {
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

// ===============================
// タブ切り替え
// ===============================
function switchType(type) {
  currentType = type;
  loadSlots();
}
