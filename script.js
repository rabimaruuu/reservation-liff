const GAS_URL = "https://script.google.com/macros/s/AKfycbwzLWMcHFhut_G8bWmoBkVtvQUR4XtG9ge3M-3O3MzqbJj4Wx-Tbwzlxz5ohvJXXqGf/exec";

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