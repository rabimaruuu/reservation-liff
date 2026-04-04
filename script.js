const GAS_URL = "https://script.google.com/macros/s/AKfycbxLL7kf1Hw-ektLYRnW4DI2MRTBhS3f-_LZZtsUWgJrNAzWAQlxc8FR04K3A5_3Po/exec";
async function fetchSlots() {
  const res = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getSlots" })
  });

  const slots = await res.json();
  renderSlots(slots);
}

function renderSlots(slots) {
  const container = document.getElementById("slots");
  container.innerHTML = "";

  slots.forEach(slot => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${slot.title}</strong><br>
      ${slot.start} 〜 ${slot.end}
    `;
    container.appendChild(div);
  });
}

async function main() {
  await liff.init({ liffId: "2009690638-qEYZlp9U" });
  fetchSlots();
}

main();