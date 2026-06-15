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
    statusEl.textContent = getConnectionHelp(action);
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  for (const button of buttons) button.disabled = isBusy;
}

function getConnectionHelp(action) {
  if (action === "captureOriginals") {
    return "当前页面与扩展脚本已断开，通常是页面长时间未刷新、扩展刚更新或浏览器挂起导致。请刷新页面后重新点击“捕获英文原文”。";
  }
  if (action === "showBilingual") {
    return "当前页面与扩展脚本已断开，无法读取本页缓存。请刷新页面，重新捕获英文原文，再使用 Chrome 翻译并显示中英对照。";
  }
  return "当前页面与扩展脚本已断开，通常刷新页面后即可恢复。";
}
