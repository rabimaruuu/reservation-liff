// ===============================
// プラン定義（分単位）
// ===============================
const PLANS = [
  { name: "通常（60分）", duration: 60 },
  { name: "ロング（90分）", duration: 90 },
  { name: "スペシャル（120分）", duration: 120 }
];

// ===============================
// 状態管理
// ===============================
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let currentType = "online"; // "online" | "offline"

let slotCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

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

  renderMonthCalendar();
};

// ===============================
// タブ切り替え
// ===============================
document.getElementById("tab-online").onclick = () => {
  currentType = "online";
  debouncedRender();
};
document.getElementById("tab-offline").onclick = () => {
  currentType = "offline";
  debouncedRender();
};

// ===============================
// タイトルから種別判定
// ===============================
function detectTypeFromTitle(title) {
  if (!title) return "both";

  if (title.includes("オンライン")) return "online";
  if (title.includes("対面")) return "offline";

  return "both"; // 種別なしは両方OK
}

// ===============================
// 時刻フォーマット
// ===============================
function formatTime(d) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// ===============================
// 予約枠取得（キャッシュ付き）
// ===============================
async function getSlots() {
  console.log("getSlots() called");
  const now = Date.now();

if (slotCache && lastFetchTime && now - lastFetchTime < CACHE_TTL) {
  return slotCache;
}

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getSlots" })
  });

  const data = await res.json();
  console.log("getSlots response:", data);

  const frames = data.frames || [];
  const bookings = data.bookings || [];

  // 予約イベントは全タイプ共通で保持（オンライン/対面両方の予約を含む）
  window.currentBookings = bookings;

  // ★ タブの種別に応じて枠を絞り込む
  const filteredFrames = frames.filter(f => {
    const t = detectTypeFromTitle(f.summary || "");
    if (t === "both") return true;
    return t === currentType;
  });

  slotCache = filteredFrames;
  lastFetchTime = now;

  return filteredFrames;
}

// ===============================
// 月間カレンダー
// ===============================
async function renderMonthCalendar() {
  const frames = await getSlots();
  const slotDates = frames.map(s => s.start.dateTime.split("T")[0]);

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  document.getElementById("calendar-title").textContent =
    `${currentYear}年 ${currentMonth + 1}月`;

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  for (let i = 0; i < startWeekday; i++) grid.innerHTML += `<div></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const today = new Date().toISOString().split("T")[0];
    const hasSlot = slotDates.includes(dateStr) && dateStr >= today;

    grid.innerHTML += `
      <div class="calendar-cell ${hasSlot ? "has-slot" : ""}"
           onclick="selectDate('${dateStr}')">
        ${day}
      </div>
    `;
  }

  // デフォルトで今日以降の最初の枠日を選択してもいいならここで selectDate 呼んでもOK
}

// ===============================
// 日付選択 → 枠一覧
// ===============================
async function selectDate(dateStr) {
  console.log("clicked dateStr:", dateStr); 
  const slots = await getSlots();
    const filtered = slots.filter(s => {
    const d = new Date(s.start.dateTime);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const slotDate = `${y}-${m}-${day}`;
    console.log("slot:", s.start.dateTime, "→", slotDate);
    return slotDate === dateStr;
  });
  console.log("selectDate:", dateStr, filtered);

  document.getElementById("slot-title").textContent = `${dateStr} の空き枠`;

  const container = document.getElementById("slots");
  container.innerHTML = "";

  filtered.forEach(s => {
    const title = s.summary;

    container.innerHTML += `
      <div class="slot-row">
        <span>${title}</span>
        <button class="slot-btn" onclick="openConfirm('${title}', '${dateStr}')">予約</button>
      </div>
    `;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div>この日の空き枠はありません</div>`;
  }
}

// ===============================
// 枠選択 → プラン選択
// ===============================
function openConfirm(title, dateStr) {
  const slotType = detectTypeFromTitle(title);

  document.getElementById("confirm-modal").style.display = "block";

  let typeText = "";
  if (slotType === "online") typeText = "（オンラインのみ）";
  if (slotType === "offline") typeText = "（対面のみ）";
  if (slotType === "both") typeText = "（オンライン / 対面 選択可）";

  document.getElementById("confirm-text").innerHTML = `
    <strong>${dateStr}</strong><br>
    枠：${title}<br>
    ${typeText}<br><br>
    プランを選択してください：
  `;

  const container = document.getElementById("confirm-options");
  container.innerHTML = "";

  PLANS.forEach(plan => {
    const btn = document.createElement("button");
    btn.className = "plan-btn";
    btn.textContent = plan.name;

    btn.onclick = () => openTimeSelect(title, dateStr, plan.duration, slotType);

    container.appendChild(btn);
  });

  document.getElementById("confirm-cancel").onclick = () => {
    document.getElementById("confirm-modal").style.display = "none";
  };
}

// ===============================
// プラン選択 → 時間帯生成
// ===============================
function openTimeSelect(title, dateStr, duration, slotType) {
  const parts = title.split("｜");
  // 例: 「横浜｜09:00-17:30｜オンライン」
  // [0]=場所, [1]=時間帯, [2]=種別
  const place = parts[0];
  const timeRange = parts[1] || "";
  const [startStr, endStr] = timeRange.split("-");

  const frameStart = new Date(`${dateStr}T${startStr}:00`);
  const frameEnd = new Date(`${dateStr}T${endStr}:00`);

  // 予約イベントを取得（この日はすべて対象）
  const bookings = (window.currentBookings || [])
    .filter(b => b.start.dateTime.startsWith(dateStr))
    .map(b => ({
      start: new Date(b.start.dateTime),
      end: new Date(b.end.dateTime)
    }));

  const freeRanges = subtractBookings(
    { start: frameStart, end: frameEnd },
    bookings
  );

  const options = [];

  freeRanges.forEach(range => {
    let t = new Date(range.start);

    while (t.getTime() + duration * 60000 <= range.end.getTime()) {
      const start = new Date(t);
      const end = new Date(t.getTime() + duration * 60000);

      options.push({
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${formatTime(start)}〜${formatTime(end)}`
      });

      t = new Date(t.getTime() + 30 * 60000);
    }
  });

  document.getElementById("confirm-text").innerHTML = `
    <strong>${dateStr}</strong><br>
    プラン：${duration}分<br><br>
    時間帯を選択してください：
  `;

  const container = document.getElementById("confirm-options");
  container.innerHTML = "";

  if (options.length === 0) {
    container.innerHTML = `<div>このプランで予約可能な時間帯はありません</div>`;
    return;
  }

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "time-btn";
    btn.textContent = opt.label;

    btn.onclick = () => openFinalConfirm(opt.start, opt.end, slotType, duration, dateStr);

    container.appendChild(btn);
  });
}

// ===============================
// 予約枠から予約済みを引く
// ===============================
function subtractBookings(frame, bookings) {
  // frame: { start: Date, end: Date }
  // bookings: [{ start: Date, end: Date }]
  let ranges = [{ start: frame.start, end: frame.end }];

  bookings.forEach(b => {
    const newRanges = [];

    ranges.forEach(r => {
      // 完全に被らない
      if (b.end <= r.start || b.start >= r.end) {
        newRanges.push(r);
        return;
      }

      // 前側が空く
      if (b.start > r.start) {
        newRanges.push({ start: r.start, end: b.start });
      }

      // 後ろ側が空く
      if (b.end < r.end) {
        newRanges.push({ start: b.end, end: r.end });
      }
    });

    ranges = newRanges;
  });

  return ranges;
}

// ===============================
// 最終確認画面
// ===============================
function openFinalConfirm(start, end, slotType, duration, dateStr) {
  const modal = document.getElementById("final-confirm-modal");
  modal.style.display = "block";

  const startTime = start.split("T")[1].substring(0,5);
  const endTime = end.split("T")[1].substring(0,5);

  document.getElementById("final-confirm-text").innerHTML = `
    <strong>予約内容の確認</strong><br><br>
    日付：${dateStr}<br>
    時間：${startTime}〜${endTime}<br>
    プラン：${duration}分<br>
    種別：${slotType === "online" ? "オンライン" : "対面"}<br><br>
    この内容で予約しますか？
  `;

  // 確定ボタン
  document.getElementById("final-confirm-ok").onclick = () => {
    modal.style.display = "none";
    reserve(start, end, slotType);
  };

  // 戻るボタン
  document.getElementById("final-confirm-cancel").onclick = () => {
    modal.style.display = "none";
  };
}


// ===============================
// 予約確定
// ===============================
async function reserve(start, end, slotType) {
  const profile = await liff.getProfile();

  const finalType = slotType === "both" ? currentType : slotType;

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "reserve",
      userId: profile.userId,
      displayName: profile.displayName,
      start,
      end,
      type: finalType
    })
  });

  const data = await res.json();

  if (data.status === "success") {
    alert("予約が完了しました！");
    slotCache = null;
  } else if (data.message === "already_reserved") {
    alert("その時間はすでに予約されています");
  } else {
    alert("予約に失敗しました");
  }

  document.getElementById("confirm-modal").style.display = "none";
  renderMonthCalendar();
}
