console.log("script.js 読み込まれた");

const GAS_URL = "https://script.google.com/macros/s/AKfycbxLL7kf1Hw-ektLYRnW4DI2MRTBhS3f-_LZZtsUWgJrNAzWAQzIxc8FR04K3A5_3Po/exec";

async function fetchSlots() {
    console.log("fetchSlots() 実行");

    const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "getSlots" })
    });

    console.log("fetchSlots() 取得完了");

    const slots = await res.json();
    console.log("取得した slots:", slots);

    renderSlots(slots);
}

function renderSlots(slots) {
    console.log("renderSlots() 実行");

    const container = document.getElementById("slots");
    container.innerHTML = "";

    slots.forEach(slot => {
        const div = document.createElement("div");
        div.innerHTML = `
            <strong>${slot.title}</strong><br>
            ${slot.start} ~ ${slot.end}
        `;
        container.appendChild(div);
    });

    console.log("renderSlots() 完了");
}

async function main() {
    console.log("main() 開始");

    await liff.init({ liffId: "2009690638-qEYZlp9U" });
    console.log("liff.init 完了");

    fetchSlots();
}

main();
