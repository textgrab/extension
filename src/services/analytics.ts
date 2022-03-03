export interface AnalyticsConfig {
  tracking_id: string;
  client_id: string;
}

type StringMap = { [key: string]: string };

export class AnalyticsService {
  config: AnalyticsConfig;
  manifest: chrome.runtime.Manifest;
  enabled: boolean;

  constructor(
    config: AnalyticsConfig,
    manifest: chrome.runtime.Manifest,
    enabled = true
  ) {
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
  track(
    category: string,
    event: string,
    label: string,
    value?: string,
    data: StringMap = {}
  ): void {
    if (!this.enabled) {
      return;
    }
    const HOST_URL = "https://www.google-analytics.com/collect";
    const params: StringMap = {
      v: "1",
      tid: this.config.tracking_id,
      cid: this.config.client_id,
      an: this.manifest.name,
      av: this.manifest.version,
      t: "event",
      ec: category,
      ea: event,
      el: label,
      aip: "1",
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

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export function trackEvent(
  category: string,
  action: string,
  label: string,
  value: number | null = null
) {
  const data: StringMap = {
    type: "event",
    category,
    event: action,
    label,
  };
  if (value != null) {
    data.value = value.toString();
  }
  chrome.runtime.sendMessage(data);
}
