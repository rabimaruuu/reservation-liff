// ===============================
// LIFF 初期化
// ===============================
window.onload = async () => {
  await liff.init({ liffId: APP_CONFIG.LIFF_ID });

  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  renderHistory();
};

// ===============================
// 予約履歴取得
// ===============================
async function getHistory() {
  const profile = await liff.getProfile();

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "history",
      userId: profile.userId
      type: "online"   // ← オンライン履歴
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

  if (history.length === 0) {
    container.innerHTML = "<p>予約はありません。</p>";
    return;
  }

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
    renderHistory();
  } else {
    alert("キャンセルに失敗しました");
  }
}

// ===============================
// 予約変更モーダル
// ===============================
function openEdit(eventId, start, end) {
  document.getElementById("edit-modal").style.display = "block";

  document.getElementById("edit-old-time").textContent =
    `変更前：${new Date(start).toLocaleString()}〜${new Date(end).toLocaleString()}`;

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
    document.getElementById("edit-modal").style.display = "none";
    renderHistory();
  } else if (data.message === "already_reserved") {
    alert("その時間はすでに予約されています");
  } else {
    alert("変更に失敗しました");
  }
}
