// Ideally should be in a library
// This function is reused
function trackEvent(category, action, label, value = null) {
  const data = {
    type: "event",
    category,
    event: action,
    label,
  };
  if (value != null) {
    data["value"] = value;
  }
  chrome.runtime.sendMessage(data);
}

const OPTIONS = {
  highlightColor: "rgba(0,0,0,0)",
};

// Where we will expose all the data we retrieve from storage.sync.
const settingsCache = {};
const newSettings = {};

// Asynchronously retrieve data from storage.sync, then cache it.
const initSettingsCache = loadUserPrefs().then((items) => {
  // Copy the data retrieved from storage into storageCache.
  Object.assign(settingsCache, items);
  Object.assign(newSettings, items);
});

function restoreDefaults() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(OPTIONS, function () {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(OPTIONS);
    });
  });
}

function loadUserPrefs() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(OPTIONS, function (data) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(data);
    });
  });
}

function saveSettings() {
  if (newSettings.hasOwnProperty("highlightColor")) {
    trackEvent("options", "highlightColor", newSettings.highlightColor);
  }
  Object.assign(settingsCache, newSettings);
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(settingsCache, function () {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

function onUpdateNewSettings() {
  function isSettingsEqual() {
    for (var propertyName in settingsCache) {
      if (
        settingsCache.hasOwnProperty(propertyName) &&
        settingsCache[propertyName] !== newSettings[propertyName]
      ) {
        console.log(settingsCache[propertyName], newSettings[propertyName]);
        return false;
      }
    }
    return true;
  }
  const saveBtn = document.querySelector("#save-btn");
  if (isSettingsEqual()) {
    saveBtn.classList.add("disabled");
    saveBtn.disabled = true;
  } else {
    saveBtn.classList.remove("disabled");
    saveBtn.disabled = false;
  }
}

function setUpColourPicker(parent) {
  // Create a new Picker instance and set the parent element.
  // By default, the color picker is a popup which appears when you click the parent.
  var picker = new Picker(parent);
  picker.setOptions({
    popup: "bottom",
  });
  document
    .querySelector("#colour-option")
    .addEventListener("click", function () {
      parent.click();
    });

  // You can do what you want with the chosen color using two callbacks: onChange and onDone.
  picker.onChange = function (color) {
    parent.style.background = color.rgbaString;
    newSettings.highlightColor = color.rgbaString;
    onUpdateNewSettings();
  };

  picker.onDone = function ({ rgbaString }) {
    newSettings.highlightColor = rgbaString;
    onUpdateNewSettings();
  };

  parent.style.background = settingsCache.highlightColor;
  picker.setColor(settingsCache.highlightColor);

  return picker;
}

function setUpButtons() {
  const restoreDefaultsBtn = document.querySelector("#restore-defaults-btn");
  restoreDefaultsBtn.addEventListener("click", () => {
    if (confirm("Restore defaults?") == true) {
      trackEvent("buttons", "options", "restore_defaults_btn");
      restoreDefaults().then(() => {
        location.reload();
      });
    }
  });

  const saveBtn = document.querySelector("#save-btn");
  saveBtn.addEventListener("click", async () => {
    trackEvent("buttons", "options", "save_settings_btn");
    await saveSettings();
    onUpdateNewSettings();
    alert("Saved Settings!");
  });
}

async function main() {
  try {
    await initSettingsCache;
  } catch (e) {
    // Handle error that occurred during storage initialization.
  }

  const colorPreview = document.querySelector("#colour-preview");
  setUpColourPicker(colorPreview);

  setUpButtons();
}

document.addEventListener("DOMContentLoaded", main);
