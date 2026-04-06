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

    let profile = null;

    // ログインしている場合だけプロフィール取得
    if (liff.isLoggedIn()) {
        try {
            profile = await liff.getProfile();
            console.log("ユーザー情報:", profile);
        } catch (e) {
            console.log("プロフィール取得失敗:", e);
        }
    } else {
        console.log("ログインしていません（検証モード）");
    }

    // ▼ ログインしていなくても予約枠は取得する
    fetchSlots();
}

main();
