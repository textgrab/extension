function onGetStartedClick() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  console.log("onGetStartedClick");
}

document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("get-started-btn")
    .addEventListener("click", onGetStartedClick);
});
