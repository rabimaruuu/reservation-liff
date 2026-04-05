const GAS_URL = "https://script.google.com/macros/s/AKfycbxLL7kf1Hw-ektLYRnW4DI2MRTBhS3f-_LZZtsUWgJrNAzWAQlxc8FR04K3A5_3Po/exec";

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