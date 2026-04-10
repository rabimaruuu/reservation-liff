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
            slotId: slotId
        })
    });

    fetchReservations();
}

fetchReservations();
