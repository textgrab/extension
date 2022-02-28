const DATA_PREFERENCE = {
  analyticsOptIn: true,
};
function onGetStartedClick() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  console.log("onGetStartedClick");
}

function loadDataPreference() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(DATA_PREFERENCE, function (data) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(data.analyticsOptIn);
    });
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  let analyticsOptIn = document.getElementById("send-anonymous-check");
  let userDataPref = await loadDataPreference();
  analyticsOptIn.checked = userDataPref;
  analyticsOptIn.addEventListener("change", function () {
    let newVal = this.checked;
    chrome.storage.sync.set({ analyticsOptIn: newVal });
  });
});
