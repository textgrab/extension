export interface Options {
  [key: string]: string | boolean;
  highlightColor: string;
  analyticsOptIn: boolean;
  USER_UUID: string;
}

export const DEFAULT_OPTIONS: Options = {
  highlightColor: "rgba(0,0,0,0)",
  analyticsOptIn: true,
  USER_UUID: "",
};

export function restoreDefaults(): Promise<Options> {
  return new Promise<Options>((resolve, reject) => {
    chrome.storage.sync.set(DEFAULT_OPTIONS, function () {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(DEFAULT_OPTIONS);
    });
  });
}

export function loadUserPrefs(): Promise<Options> {
  return new Promise<Options>((resolve, reject) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, function (data) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(data as Options);
    });
  });
}

export function saveOptions(options: Options) {
  return new Promise<void>((resolve, reject) => {
    chrome.storage.sync.set(options, function () {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
}
