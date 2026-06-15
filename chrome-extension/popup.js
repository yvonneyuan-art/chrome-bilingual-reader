const statusEl = document.getElementById("status");
const buttons = Array.from(document.querySelectorAll("button"));

const actions = {
  capture: "captureOriginals",
  show: "showBilingual",
  hide: "hideBilingual",
  clear: "clearOriginals"
};

for (const [id, action] of Object.entries(actions)) {
  document.getElementById(id).addEventListener("click", () => sendAction(action));
}

async function sendAction(action) {
  setBusy(true);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    const response = await chrome.tabs.sendMessage(tab.id, { action });
    statusEl.textContent = response?.message || "完成。";
  } catch (error) {
    statusEl.textContent = "无法连接当前网页，请刷新页面后再试。";
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  for (const button of buttons) button.disabled = isBusy;
}
