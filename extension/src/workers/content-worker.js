async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

// inject the text capture script
async function injectScript() {
  let tab = await getCurrentTab();

  chrome.tabs.sendMessage(
    (tabId = tab.id),
    (message = { type: "cancelCapture" }),
    (callback = () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["src/textgrab.js"],
      });
    })
  );
}

// TODO: we can access CORS in background page
function handleGetImageData(req) {}

function handleCaptureButton(req) {
  injectScript();
  return { message: "Capturing..." };
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (!request.type) {
    sendResponse({ error: "No type specified" });
    return;
  }
  const handlers = { captureBtn: handleCaptureButton };
  const handler = handlers[request.type];
  if (!handler) {
    sendResponse({ error: "No handler for type" });
    return;
  }
  sendResponse(handler(request));
});

chrome.commands.onCommand.addListener(function (command) {
  switch (command) {
    case "textgrab": {
      injectScript();
      break;
    }
  }
});
