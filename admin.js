async function fetchReservations() {
    const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getReservations" })
    });

    const list = await res.json();
    renderAdminList(list);
}

function renderAdminList(list) {
    const container = document.getElementById("admin-list");
    container.innerHTML = "";

    list.forEach(r => {
        container.innerHTML += `
            <div class="admin-item">
                <span>${r.timestamp}</span>
                <span>${r.slotId}</span>
                <button onclick="deleteRes('${r.slotId}')">削除</button>
            </div>
        `;
    });
}

async function deleteRes(slotId) {
    const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "deleteReservation",
            slotId: slotId,
            calendarId: "5435128daa986e7c47f273f31fa5cd8063fa90171d838de5d9222f4a3b7c9dfa@group.calendar.google.com" // ← オンライン用
        })
    });

    fetchReservations();
}
    fetchReservations();
}

fetchReservations();
