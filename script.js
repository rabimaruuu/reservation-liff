// ===============================
// 状態管理
// ===============================
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-11
let currentType = "online"; // "online" or "offline"

// 予約枠キャッシュ
let slotCache = {
  online: null,
  offline: null
};
let lastFetchTime = {
  online: 0,
  offline: 0
};
const CACHE_TTL = 5 * 60 * 1000; // 5分

// ===============================
// デバウンス
// ===============================
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const debouncedRender = debounce(renderMonthCalendar, 300);

// ===============================
// LIFF 初期化
// ===============================
window.onload = async () => {
  await liff.init({ liffId: APP_CONFIG.LIFF_ID });

  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  // 初期タブ状態
  document.getElementById("tab-online").classList.add("active");
  document.getElementById("tab-offline").classList.remove("active");

  renderMonthCalendar();
};


// ===============================
// タブ切り替え
// ===============================
document.getElementById("tab-online").onclick = () => {
  currentType = "online";
  document.getElementById("tab-online").classList.add("active");
  document.getElementById("tab-offline").classList.remove("active");
  debouncedRender();
};

document.getElementById("tab-offline").onclick = () => {
  currentType = "offline";
  document.getElementById("tab-online").classList.remove("active");
  document.getElementById("tab-offline").classList.add("active");
  debouncedRender();
};

// ===============================
// 予約枠取得（キャッシュ付き）
// ===============================
async function getSlots() {
  const now = Date.now();

  // キャッシュ有効ならそれを返す
  if (
    slotCache[currentType] &&
    now - lastFetchTime[currentType] < CACHE_TTL
  ) {
    return slotCache[currentType];
  }

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "getSlots"
    })
  });

  const data = await res.json();

  slotCache[currentType] = data;
  lastFetchTime[currentType] = now;

  return data;
}

// ===============================
// 予約履歴取得
// ===============================
async function getHistory() {
  const userId = liff.getContext().userId;

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "history",
      userId,
      type: currentType
    })
  });

  return await res.json();
}
// ===============================
// 予約履歴表示
// ===============================
async function renderHistory() {
  const history = await getHistory();
  const container = document.getElementById("history-list");
  container.innerHTML = "";

  history.forEach(e => {
    const start = new Date(e.start.dateTime).toLocaleString();
    const end = new Date(e.end.dateTime).toLocaleString();

    container.innerHTML += `
      <div class="history-row">
        <div class="history-info">
          <span>${start}〜${end}</span>
        </div>
        <div class="history-actions">
          <button class="edit-btn" onclick="openEdit('${e.id}', '${e.start.dateTime}', '${e.end.dateTime}')">変更</button>
          <button class="cancel-btn" onclick="cancelReservation('${e.id}')">キャンセル</button>
        </div>
      </div>
    `;
  });
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
    const today = new Date().toISOString().split("T")[0];
    const hasSlot = slotDates.includes(dateStr) && dateStr >= today;


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
    const title = s.summary; // 例：横浜｜14:00-15:00

    container.innerHTML += `
      <div class="slot-row">
        <span>${title}</span>
        <button class="slot-btn" onclick="openConfirm('${title}', '${dateStr}')">予約</button>
      </div>
    `;
  });
}


// ===============================
// 新規予約用モーダル
// ===============================
function openConfirm(title, dateStr) {
  document.getElementById("confirm-modal").style.display = "block";
  document.getElementById("confirm-text").textContent =
    `予約枠：${title}（${dateStr}）`;

  document.getElementById("confirm-ok").onclick = () => reserve(title, dateStr);
  document.getElementById("confirm-cancel").onclick = () => {
    document.getElementById("confirm-modal").style.display = "none";
  };
}


// ===============================
// 予約確定
// ===============================
async function reserve(title, dateStr) {
  const profile = await liff.getProfile();

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "reserve",
      userId: profile.userId,
      displayName: profile.displayName,
      title,
      date: dateStr
    })
  });

  const data = await res.json();

  if (data.status === "success") {
    alert("予約が完了しました！");
    slotCache.online = null;
    slotCache.offline = null;
  } else if (data.message === "already_reserved") {
    alert("その枠はすでに予約されています");
  } else {
    alert("予約に失敗しました");
  }

  document.getElementById("confirm-modal").style.display = "none";
  renderMonthCalendar();
}


// ===============================
// 予約キャンセル
// ===============================
async function cancelReservation(eventId) {
  if (!confirm("本当にキャンセルしますか？")) return;

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "cancel",
      eventId
    })
  });

  const data = await res.json();

  if (data.status === "success") {
    alert("キャンセルしました");
    slotCache.online = null;
    slotCache.offline = null;
    renderMonthCalendar();
  } else {
    alert("キャンセルに失敗しました");
  }
}


// ===============================
// 予約変更モーダル
// ===============================
function openEdit(eventId, start, end) {
  document.getElementById("confirm-modal").style.display = "none";
  document.getElementById("edit-modal").style.display = "block";

  document.getElementById("edit-old-time").textContent =
    `変更前：${new Date(start).toLocaleString()}〜${new Date(end).toLocaleString()}`;

  // datetime-local 用に変換
  const formatForInput = (dt) => {
    const d = new Date(dt);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  document.getElementById("edit-start").value = formatForInput(start);
  document.getElementById("edit-end").value = formatForInput(end);

  document.getElementById("edit-ok").onclick = () => updateReservation(eventId);
  document.getElementById("edit-cancel").onclick = () => {
    document.getElementById("edit-modal").style.display = "none";
  };
}


// ===============================
// 予約変更
// ===============================
async function updateReservation(eventId) {
  const newStart = document.getElementById("edit-start").value;
  const newEnd = document.getElementById("edit-end").value;

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update",
      eventId,
      start: newStart,
      end: newEnd
    })
  });

  const data = await res.json();

  if (data.status === "success") {
    alert("予約を変更しました");
    slotCache.online = null;
    slotCache.offline = null;
    renderMonthCalendar();
  } else if (data.message === "already_reserved") {
    alert("その時間はすでに予約されています");
  } else {
    alert("変更に失敗しました");
  }

  document.getElementById("edit-modal").style.display = "none";
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
  debouncedRender();
};

document.getElementById("next-month").onclick = () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  debouncedRender();
};
