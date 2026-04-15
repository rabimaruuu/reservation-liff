// ===============================
// 初期設定
// ===============================
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-11
let currentType = "online"; // デフォルトはオンライン

// ===============================
// LIFF 初期化
// ===============================
window.onload = async () => {
  await liff.init({ liffId: APP_CONFIG.LIFF_ID });

  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  renderMonthCalendar();
};

// ===============================
// オンライン / 対面 切り替え
// ===============================
document.getElementById("tab-online").onclick = () => {
  currentType = "online";
  document.getElementById("tab-online").classList.add("active");
  document.getElementById("tab-offline").classList.remove("active");
  renderMonthCalendar();
};

document.getElementById("tab-offline").onclick = () => {
  currentType = "offline";
  document.getElementById("tab-online").classList.remove("active");
  document.getElementById("tab-offline").classList.add("active");
  renderMonthCalendar();
};

// ===============================
// 予約枠取得（Cloud Functions）
// ===============================
async function getSlots() {
  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "getSlots"
    })
  });

  return await res.json();
}

// ===============================
// 月間カレンダー描画
// ===============================
async function renderMonthCalendar() {
  const slots = await getSlots();
  const slotDates = slots.map(s => s.start.dateTime.split("T")[0]);

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  document.getElementById("calendar-title").textContent =
    `${currentYear}年 ${currentMonth + 1}月`;

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  // 空白セル
  for (let i = 0; i < startWeekday; i++) {
    grid.innerHTML += `<div></div>`;
  }

  // 日付セル
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasSlot = slotDates.includes(dateStr);

    grid.innerHTML += `
      <div class="calendar-cell ${hasSlot ? "has-slot" : ""} ${isToday(dateStr) ? "today" : ""}"
           onclick="selectDate('${dateStr}')">
        ${day}
      </div>
    `;
  }
}

function isToday(dateStr) {
  const today = new Date().toISOString().split("T")[0];
  return dateStr === today;
}

// ===============================
// 日付選択 → 枠一覧表示
// ===============================
async function selectDate(dateStr) {
  const slots = await getSlots();
  const filtered = slots.filter(s => s.start.dateTime.startsWith(dateStr));

  document.getElementById("slot-title").textContent = `${dateStr} の空き枠`;

  const container = document.getElementById("slots");
  container.innerHTML = "";

  filtered.forEach(s => {
    const start = new Date(s.start.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const end = new Date(s.end.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    container.innerHTML += `
      <button class="slot-btn" onclick="openConfirm('${s.start.dateTime}', '${s.end.dateTime}')">
        ${start}〜${end}
      </button>
    `;
  });
}

// ===============================
// モーダル表示
// ===============================
function openConfirm(start, end) {
  document.getElementById("confirm-modal").style.display = "block";
  document.getElementById("confirm-text").textContent =
    `予約時間：${new Date(start).toLocaleString()}〜${new Date(end).toLocaleString()}`;

  document.getElementById("confirm-ok").onclick = () => reserve(start, end);
  document.getElementById("confirm-cancel").onclick = () => {
    document.getElementById("confirm-modal").style.display = "none";
  };
}

// ===============================
// 予約確定（Cloud Functions）
// ===============================
async function reserve(start, end) {
  const userId = liff.getContext().userId;

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "reserve",
      userId,
      type: currentType,
      start,
      end
    })
  });

  const data = await res.json();

  if (data.status === "success") {
    alert("予約が完了しました！");
  } else if (data.message === "already_reserved") {
    alert("その時間はすでに予約されています");
  } else {
    alert("予約に失敗しました");
  }

  document.getElementById("confirm-modal").style.display = "none";
  renderMonthCalendar();
}

// ===============================
// 月移動
// ===============================
document.getElementById("prev-month").onclick = () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderMonthCalendar();
};

document.getElementById("next-month").onclick = () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderMonthCalendar();
};
