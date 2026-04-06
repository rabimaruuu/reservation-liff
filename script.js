console.log("script.js 読み込まれた");

const GAS_URL = "https://script.google.com/macros/s/AKfycbzSlglWYwjooOP5jOt9MCYS9FSWEAkUvgrc57z6JYoXfSQiSxgFarcaxU4tyOExXwQZ/exec";

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

    // ▼ ここでログインしていなければログインさせる
//    if (!liff.isLoggedIn()) {
//        liff.login();
//        return;
//    }

    // ▼ ログイン済みならユーザー情報を取得
    const profile = await liff.getProfile();
    console.log("ユーザー情報:", profile);

    // ▼ 予約枠を取得
    fetchSlots();
}

main();
