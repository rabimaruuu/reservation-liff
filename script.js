let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-11

// 月間カレンダー描画
async function renderMonthCalendar() {
  const slots = await getSlots(); // 既存の関数を利用
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

// 日付を選択したら枠一覧を表示
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

// 月移動
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

// 初期表示
renderMonthCalendar();
