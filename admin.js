const GAS_URL = "https://script.google.com/macros/s/AKfycbzSlglWYwjooOP5jOt9MCYS9FSWEAkUvgrc57z6JYoXfSQiSxgFarcaxU4tyOExXwQZ/exec";

async function loadReservations() {
  const res = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getReservations" })
  });

  const list = await res.json();
  renderList(list);
}

function renderList(list) {
  const container = document.getElementById("list");
  container.innerHTML = "";

  list.forEach(item => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>userId:</strong> ${item.userId}<br>
      <strong>slotId:</strong> ${item.slotId}<br>
      <strong>予約日時:</strong> ${item.timestamp}<br>
      <hr>
    `;
    container.appendChild(div);
  });
}

loadReservations();
