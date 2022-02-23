const TRACKING_ID = "UA-217904698-1";

class Analytics {
  constructor(config, manifest, enabled = true) {
    this.config = config;
    this.manifest = manifest;
    this.enabled = enabled;
  }

  /**
   * Tracks an event
   * @param {String} category the event category
   * @param {String} event the event name (action on Google Analytics)
   * @param {String} label the event label
   * @param {Number} value the event value (needs to be a positive number)
   * @param {Object} data Any additional data to be sent to Google Analytics
   */
  track(category, event, label, value, data = {}) {
    if (!this.enabled) {
      return;
    }
    const HOST_URL = "https://www.google-analytics.com/collect";
    const params = {
      v: 1,
      tid: this.config.tracking_id,
      cid: this.config.client_id,
      an: this.manifest.name,
      av: this.manifest.version,
      t: "event",
      ec: category,
      ea: event,
      el: label,
      aip: 1,
      ...data,
    };
    if (value) {
      params.ev = value;
    }
    const searchParams = new URLSearchParams(params).toString();
    fetch(`${HOST_URL}?${searchParams}`, {
      method: "POST",
    });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// https://gist.github.com/jsmithdev/1f31f9f3912d40f6b60bdc7e8098ee9f
function createUUID() {
  let dt = new Date().getTime();

  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c) {
      const r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    }
  );

  return uuid;
}

function getClientInfo() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(
      { USER_UID: null, analyticsOptIn: true },
      function (data) {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        if (data.USER_UID) {
          return resolve(data);
        } else {
          const uuid = createUUID();
          chrome.storage.sync.set({ USER_UID: uuid }, function () {
            resolve({ USER_UID: uuid, analyticsOptIn: data.analyticsOptIn });
          });
        }
      }
    );
  });
}

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

let analytics = null;
let clientInfo = null;

const initialize = getClientInfo().then((data) => {
  clientInfo = data;
  // These aren't actually secret so it's safe to expose them
  // within the client.
  analytics = new Analytics(
    {
      tracking_id: TRACKING_ID,
      client_id: clientInfo.USER_UID,
    },
    chrome.runtime.getManifest(),
    clientInfo.analyticsOptIn
  );
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.analyticsOptIn) {
    const collectAnalytics = Boolean(changes.analyticsOptIn.newValue);
    console.log("Switched analytics to", collectAnalytics);
    if (analytics) {
      analytics.setEnabled(collectAnalytics);
    }
  }
});

async function trackEvent({ category, event, label, value, data }) {
  try {
    await initialize;
  } catch (e) {
    console.log(e);
  }
  analytics.track(category, event, label, value, data || {});
}

// inject the text capture script
async function injectScript(file = "src/textgrab.js") {
  let tab = await getCurrentTab();
  chrome.tabs.sendMessage(
    (tabId = tab.id),
    (message = { type: "cancelCapture" }),
    (callback = (res) => {
      if (chrome.runtime.lastError) {
        // expected on first run. This check silences the error.
      }

      // inject CSS and then the script
      chrome.scripting.insertCSS(
        {
          target: { tabId: tab.id },
          files: ["css/textgrab.css"],
        },
        () => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [file],
          });
        }
      );
    })
  );
}

async function handleFallbackCapture() {
  injectScript("src/fallback.js");
}

async function handleTabScreenshot(req) {
  let screenshot = await chrome.tabs.captureVisibleTab(
    (options = { format: "png" })
  );
  return { message: "Success", screenshot: screenshot };
}

async function handleCaptureButton(req) {
  await injectScript();
  trackEvent({
    category: "buttons",
    event: "capture_btn",
    label: "capture",
  });
  return { message: "Capturing..." };
}

const eventHandlers = {
  captureBtn: handleCaptureButton,
  event: trackEvent,
  startFallback: handleFallbackCapture,
  getTabScreenshot: handleTabScreenshot,
};

/* Event Listeners */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (!request.type) {
    sendResponse({ error: "No type specified" });
    return true;
  }
  const handler = eventHandlers[request.type];
  if (!handler) {
    sendResponse({ error: "No handler for type" });
    return true;
  }
  handler(request).then(sendResponse);
  return true;
});

chrome.commands.onCommand.addListener(function (command) {
  switch (command) {
    case "textgrab": {
      trackEvent({
        category: "shortcuts",
        event: "alt_c",
        label: "capture",
      });
      injectScript();
      break;
    }
  }
});

chrome.runtime.onInstalled.addListener(async function (details) {
  let thisVersion = chrome.runtime.getManifest().version;
  switch (details.reason) {
    case "install":
      getClientInfo();
      trackEvent({
        category: "app_updates",
        event: "install",
        label: thisVersion,
      });
      chrome.tabs.create(
        { url: chrome.runtime.getURL("src/pages/onboarding.html") },
        function (tab) {}
      );
    case "update":
      trackEvent({
        category: "app_updates",
        event: "update",
        label: thisVersion,
      });
      break;
  }
});
