const TRACKING_ID = "UA-217904698-1";

class Analytics {
  constructor(config, manifest) {
    this.config = config;
    this.manifest = manifest;
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

function getClientID() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({ USER_UID: null }, function (data) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      if (data.USER_UID) {
        return resolve(data.USER_UID);
      } else {
        const uuid = createUUID();
        chrome.storage.sync.set({ USER_UID: uuid }, function () {});
        return resolve(uuid);
      }
    });
  });
}

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

let analytics = null;
let clientID = null;

const initialize = getClientID().then((data) => {
  clientID = data;
  // These aren't actually secret so it's safe to expose them
  // within the client.
  analytics = new Analytics(
    {
      tracking_id: TRACKING_ID,
      client_id: clientID,
    },
    chrome.runtime.getManifest()
  );
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
async function injectScript() {
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
            files: ["src/textgrab.js"],
          });
        }
      );
    })
  );
}

// TODO: we can access CORS in background page
async function handleGetImageData(req) {}

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
};

/* Event Listeners */
chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (!request.type) {
    sendResponse({ error: "No type specified" });
    return true;
  }
  const handler = eventHandlers[request.type];
  if (!handler) {
    sendResponse({ error: "No handler for type" });
    return true;
  }
  let response = await handler(request);
  sendResponse(response);
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
      chrome.storage.sync.set({ USER_UID: createUUID() }, function () {
        trackEvent({
          category: "app_updates",
          event: "install",
          label: thisVersion,
        });
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
