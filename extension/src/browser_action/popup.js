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
      chrome.runtime.sendMessage({ myPopupIsOpen: true });
    },
    false
  );
}
document.addEventListener("DOMContentLoaded", main, false);
