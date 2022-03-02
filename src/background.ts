import { AnalyticsService } from "./services/analytics";
import { loadUserPrefs, Options, saveOptions } from "./services/preferences";
import { createUUID } from "./utils/uuid";
const TRACKING_ID = "UA-217904698-1";

async function getClientInfo() {
  const data = await loadUserPrefs();

  if (data.USER_UUID && data.USER_UUID.length > 0) {
    return data;
  }
  data.USER_UUID = createUUID();
  await saveOptions(data);
  return data;
}

async function getCurrentTab(): Promise<chrome.tabs.Tab> {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

let analytics: AnalyticsService | null = null;
let clientInfo: Options | null = null;

const initialize = getClientInfo().then((data: Options) => {
  clientInfo = data;
  // These aren't actually secret so it's safe to expose them
  // within the client.
  analytics = new AnalyticsService(
    {
      tracking_id: TRACKING_ID,
      client_id: clientInfo.USER_UUID,
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

async function trackEvent({
  category,
  event,
  label,
  value,
  data,
}: {
  category: string;
  event: string;
  label: string;
  value?: string;
  data?: any;
}) {
  try {
    await initialize;
  } catch (e) {
    console.log(e);
  }
  analytics?.track(category, event, label, value, data || {});
}

// inject the text capture script
async function injectScript(file = "js/textgrab.js") {
  let tab = await getCurrentTab();
  if (!tab.id) return;

  const tabId = tab.id;

  chrome.tabs.sendMessage(tabId, { type: "cancelCapture" }, (res) => {
    if (chrome.runtime.lastError) {
      // expected on first run. This check silences the error.
    }

    // inject CSS and then the script
    chrome.scripting.insertCSS(
      {
        target: { tabId },
        files: ["css/textgrab.css"],
      },
      () => {
        chrome.scripting.executeScript({
          target: { tabId },
          files: [file],
        });
      }
    );
  });
}

async function handleFallbackCapture() {
  injectScript("js/fallback.js");
}

async function handleTabScreenshot(req: any) {
  let screenshot = await chrome.tabs.captureVisibleTab({ format: "png" });
  return { message: "Success", screenshot: screenshot };
}

async function handleCaptureButton(req: any) {
  await injectScript();
  trackEvent({
    category: "buttons",
    event: "capture_btn",
    label: "capture",
  });
  return { message: "Capturing..." };
}

type ReqHandler = (req: any) => Promise<any>;

const eventHandlers: { [key: string]: ReqHandler } = {
  captureBtn: handleCaptureButton,
  event: trackEvent,
  startFallback: handleFallbackCapture,
  getTabScreenshot: handleTabScreenshot,
};

/* Event Listeners */
chrome.runtime.onMessage.addListener(function (
  request: {
    type: "captureBtn" | "event" | "startFallback" | "getTabScreenshot";
  },
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
    case "textgrab_fallback": {
      trackEvent({
        category: "shortcuts",
        event: "alt_t",
        label: "fallback_capture",
      });
      handleFallbackCapture();
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
        { url: chrome.runtime.getURL("onboarding.html") },
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

chrome.runtime.setUninstallURL(
  "https://docs.google.com/forms/d/e/1FAIpQLScN9aLqweRqjtog5mKKDHFnO2UjxXurB2iRxWMWC_A9hwht6A/viewform?usp=sf_link"
);
