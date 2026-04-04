const GAS_URL = "https://script.google.com/macros/s/AKfycbxTyOy6lOtQwpO4_Ms54XaI_0lHsoaSxGR-pphj-K2pQ7H4jWom6e32yahMx5RK2ch8/exec";

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