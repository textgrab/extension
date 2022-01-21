// Add a button listener
document.addEventListener(
  "DOMContentLoaded",
  async () => {
    function handleCapture() {
      // Launch the screen capture
      button.innerHTML = "Capturing...";

      // null tab ID means use active tab
      document.getElementById("description-btm").innerHTML =
        "Click out of this dialog and click on an image/video to capture text";
      chrome.runtime.sendMessage({ myPopupIsOpen: true });
    }

    const button = document.getElementById("capture-btn");

    button.addEventListener("click", handleCapture, false);
  },
  false
);
