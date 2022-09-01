import StorageService, { Serializable } from './storage'

export interface Options extends Serializable {
  highlightColor: string;
  analyticsOptIn: boolean;
  USER_UUID: string;
}

export const DEFAULT_OPTIONS: Options = {
  highlightColor: "rgba(0,0,0,0)",
  analyticsOptIn: true,
  USER_UUID: "",
  _serializedKey: "Options"
};

export function restoreDefaults(): Promise<void> {
  return StorageService.set(DEFAULT_OPTIONS);
}

export function loadUserPrefs(): Promise<Options> {
  return StorageService.get(DEFAULT_OPTIONS);
}

export function saveOptions(options: Options): Promise<void> {
  return StorageService.set(options);
}
