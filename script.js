console.log("script.js 読み込まれた");

// --------------------------------------
// 設定
// --------------------------------------
const GAS_URL = window.APP_CONFIG.GAS_URL;

const CALENDAR_IDS = {
    online: "5435128daa986e7c47f273f31fa5cd8063fa90171d838de5d9222f4a3b7c9dfa@group.calendar.google.com",
    offline: "227a3545d36419e11e531495bbfeca568bb2b4494052b01b4574adbc1973ea27@group.calendar.google.com"
};

let currentType = "online";
let selectedDate = null;

// --------------------------------------
// LIFF 初期化
// --------------------------------------
async function initLiff() {
    console.log("LIFF 初期化開始");

    await liff.init({ liffId: "2009690638-qEYZlp9U" });

    if (liff.isLoggedIn()) {
        try {
            const profile = await liff.getProfile();
            console.log("ユーザー情報:", profile);
        } catch (e) {
            console.log("プロフィール取得失敗:", e);
        }
    } else {
        console.log("ログインしていません（検証モード）");
    }
}

// --------------------------------------
// GAS から予約枠取得
// --------------------------------------
async function fetchSlots() {
    console.log("fetchSlots() 実行");

    try {
        const res = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "getSlots",
                calendarId: CALENDAR_IDS[currentType]
            })
        });

        const slots = await res.json();
        console.log("取得した slots:", slots);

        const grouped = groupSlotsByDate(slots);
        renderCalendar(grouped);
        window._slots = grouped;

    } catch (err) {
        console.error("fetchSlots() エラー:", err);
    }
}

// --------------------------------------
// 日付ごとにまとめる
// --------------------------------------
function groupSlotsByDate(slots) {
    const map = {};

    slots.forEach(s => {
        const date = s.start.split("T")[0];
        if (!map[date]) map[date] = [];
        map[date].push(s);
    });

    return map;
}

// --------------------------------------
// カレンダー描画
// --------------------------------------
function renderCalendar(groupedSlots) {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();

    for (let i = 0; i < startWeekday; i++) {
        calendar.innerHTML += `<div></div>`;
    }

    for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const hasSlot = groupedSlots[dateStr] !== undefined;

        calendar.innerHTML += `
            <div class="calendar-day ${hasSlot ? "has-slot" : ""}" data-date="${dateStr}">
                ${d}
            </div>
        `;
    }

    document.querySelectorAll(".calendar-day.has-slot").forEach(day => {
        day.onclick = () => {
            selectedDate = day.dataset.date;
            document.querySelectorAll(".calendar-day").forEach(d => d.classList.remove("selected"));
            day.classList.add("selected");
            renderSlots();
        };
    });
}

// --------------------------------------
// 枠一覧表示
// --------------------------------------
function renderSlots() {
    const title = document.getElementById("slot-title");
    const list = document.getElementById("slots");

    title.textContent = `${selectedDate} の空き枠`;
    list.innerHTML = "";

    const slots = window._slots[selectedDate] || [];

    slots.forEach(slot => {
        list.innerHTML += `
            <div class="slot-item">
                <span>${slot.start.split("T")[1].slice(0,5)} - ${slot.end.split("T")[1].slice(0,5)}</span>
                <button onclick="openConfirmModal('${slot.id}', '${slot.start}', '${slot.end}')">予約</button>
            </div>
        `;
    });
}

// --------------------------------------
// モーダル（確認 → 予約実行）
// --------------------------------------
function openConfirmModal(slotId, start, end) {
    const text = `${start} ~ ${end} の予約を行います`;
    document.getElementById("confirm-text").textContent = text;

    document.getElementById("confirm-modal").style.display = "block";

    document.getElementById("confirm-ok").onclick = () => {
        document.getElementById("confirm-modal").style.display = "none";
        reserve(slotId, start, end);
    };

    document.getElementById("confirm-cancel").onclick = () => {
        document.getElementById("confirm-modal").style.display = "none";
    };
}

// --------------------------------------
// 予約 POST（本番）
// --------------------------------------
async function reserve(slotId, start, end) {

    const userName = "ゲスト";
    const userId = liff.isLoggedIn() ? (await liff.getProfile()).userId : "guest";

    const payload = {
        action: "reserve",
        calendarId: CALENDAR_IDS[currentType],
        name: userName,
        userId: userId,
        start: start,
        end: end
    };

    try {
        const res = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log("予約結果:", result);

        if (result.status === "success") {
            alert("予約が完了しました！");
        } else {
            alert("予約に失敗しました");
        }

    } catch (e) {
        console.error("予約エラー:", e);
        alert("通信エラーが発生しました");
    }
}

// --------------------------------------
// タブ切り替え
// --------------------------------------
document.getElementById("tab-online").onclick = () => {
    currentType = "online";
    setActiveTab();
    fetchSlots();
};

document.getElementById("tab-offline").onclick = () => {
    currentType = "offline";
    setActiveTab();
    fetchSlots();
};

function setActiveTab() {
    document.getElementById("tab-online").classList.toggle("active", currentType === "online");
    document.getElementById("tab-offline").classList.toggle("active", currentType === "offline");
}

// --------------------------------------
// 初期処理
// --------------------------------------
async function main() {
    await initLiff();
    await fetchSlots();
}

main();
