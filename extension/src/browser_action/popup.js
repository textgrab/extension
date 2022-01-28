// Ideally should be in a library
// This function is reused
function trackEvent(category, action, label, value = null) {
  const data = {
    type: "event",
    category,
    event: action,
    label,
  };
  if (value != null) {
    data["value"] = value;
  }
  chrome.runtime.sendMessage(data);
}

async function main() {
  const button = document.getElementById("capture-btn");

  button.addEventListener(
    "click",
    () => {
      // Launch the screen capture
      button.innerHTML = "Capturing...";

      // null tab ID means use active tab
      document.getElementById("description-btm").innerHTML =
        "Click out of this dialog and click on an image/video to capture text";
      chrome.runtime.sendMessage({ type: "captureBtn" });
    },
    false
  );

  const settings = document.getElementById("settings-btn");
  settings.addEventListener("click", () => {
    trackEvent("buttons", "popup", "settings_btn");
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("options.html"));
    }
  });
}
document.addEventListener("DOMContentLoaded", main, false);
