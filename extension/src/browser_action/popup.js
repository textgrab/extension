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
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("options.html"));
    }
  });
}
document.addEventListener("DOMContentLoaded", main, false);
