async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function injectScript() {
  let tab = await getCurrentTab();
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["src/textgrab.js"],
  });
}



chrome.runtime.onMessage.addListener(function (message, sender) {
  console.log(message);
  if (!message.myPopupIsOpen) return;

  injectScript();
});

chrome.commands.onCommand.addListener(function (command) {
  switch (command) {
    case "textgrab": {
      injectScript();
      break;
    }
  }
});


