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
  const captureBtn = document.getElementById("capture-btn");
  captureBtn.addEventListener(
    "click",
    () => {
      // Launch the screen capture
      captureBtn.innerHTML = "Capturing...";

      // null tab ID means use active tab
      document.getElementById("description-btm").innerHTML =
        "Click out of this dialog and click on an image/video to capture text";
      chrome.runtime.sendMessage({ type: "captureBtn" });
      window.close();
    },
    false
  );

  const fallbackCapture = document.getElementById("fallback-btn");
  fallbackCapture.addEventListener("click", () => {
    trackEvent("buttons", "popup", "fallback_capture");
    const data = {
      type: "startFallback",
    };

    chrome.runtime.sendMessage(data);

    setTimeout(() => {
      window.close();
    }, 100);
  });

  const helpBtn = document.getElementById("help-btn");
  helpBtn.addEventListener("click", () => {
    trackEvent("buttons", "popup", "help_btn");

    chrome.tabs.create({
      url: chrome.runtime.getURL("src/pages/onboarding.html"),
    });
  });

  const settings = document.getElementById("settings-btn");
  settings.addEventListener("click", () => {
    trackEvent("buttons", "popup", "settings_btn");
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("src/options/options.html"));
    }
  });

  const coffeeBtn = document.getElementById("coffee-btn");
  coffeeBtn.addEventListener("click", () => {
    trackEvent("buttons", "popup", "donate_btn");
    chrome.tabs.create({
      url: "https://www.buymeacoffee.com/textgrab",
    });
  });
}
document.addEventListener("DOMContentLoaded", main, false);
