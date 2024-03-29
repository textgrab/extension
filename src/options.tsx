import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { ChromePicker, ColorResult } from "react-color";
import { trackEvent } from "./services/analytics";
import { DEFAULT_OPTIONS, Options } from "./services/preferences";
import {
  loadUserPrefs,
  restoreDefaults,
  saveOptions,
} from "./services/preferences";

import Logo from "./assets/img/logo.svg";

import "./assets/scss/main.scss";

const OptionsPage = () => {
  const [settingsCache, setSettingsCache] = useState<Options>(DEFAULT_OPTIONS);
  const [newSettings, setNewSettings] = useState<Options>(DEFAULT_OPTIONS);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [saveBtnEnabled, setSaveBtnEnabled] = useState(false);

  useEffect(() => {
    loadUserPrefs().then((items: Options) => {
      // Copy the data retrieved from storage into storageCache.
      setSettingsCache({ ...items });
      setNewSettings({ ...items });
    });
  }, []);

  function onUpdateNewSettings() {
    function isSettingsEqual() {
      for (const propertyName in settingsCache) {
        if (
          Object.prototype.hasOwnProperty.call(settingsCache, propertyName) &&
          settingsCache[propertyName] !== newSettings[propertyName]
        ) {
          return false;
        }
      }
      return true;
    }
    setSaveBtnEnabled(!isSettingsEqual());
  }

  const onResetClick = () => {
    if (
      confirm(
        "Reset all options to their default values? This action cannot be undone!"
      ) == true
    ) {
      trackEvent("buttons", "options", "restore_defaults_btn");
      restoreDefaults().then(() => {
        location.reload();
      });
    }
  };

  const onSaveClick = async () => {
    trackEvent("buttons", "options", "save_settings_btn");
    if (Object.prototype.hasOwnProperty.call(newSettings, "highlightColor")) {
      trackEvent("options", "highlightColor", newSettings.highlightColor);
    }
    setSettingsCache({ ...newSettings });
    await saveOptions(newSettings);
    setSaveBtnEnabled(false);
    alert("Saved Settings!");
  };

  const handleColourChange = (color: ColorResult) => {
    setNewSettings({
      ...newSettings,
      highlightColor: `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${
        color.rgb.a || ""
      })`,
    });
    onUpdateNewSettings();
  };

  const handleColorClose = () => {
    setShowColorPicker(false);
  };

  return (
    <>
      <div className="logo-header">
        <img src={Logo} alt="logo" className="main-logo options-logo" />
        <h1 className="logo popup-title">TextGrab Settings</h1>
      </div>
      <h3 id="general-header">General</h3>
      <div
        className="option"
        id="colour-option"
        onClick={() => setShowColorPicker(!showColorPicker)}
      >
        <span
          className="dot"
          id="colour-preview"
          style={{ background: newSettings.highlightColor }}
        ></span>
        {showColorPicker ? (
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              top: "250px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ChromePicker
              color={newSettings.highlightColor}
              onChange={handleColourChange}
            />
          </div>
        ) : null}

        <div className="item-info">
          <span className="option-title">Highlight Colour</span>
          <p className="description">
            (Default: Transparent) The colour of the rectangle before
            highlighting. Used for visualizing text that can be selected.
          </p>
        </div>
      </div>
      <div
        className="send-analytics-pref"
        style={{ marginTop: "1rem", textAlign: "center" }}
      >
        <input
          type="checkbox"
          value=""
          id="send-anonymous-check"
          checked={newSettings.analyticsOptIn}
          onChange={({
            target: { checked },
          }: React.ChangeEvent<HTMLInputElement>) => {
            setNewSettings({ ...newSettings, analyticsOptIn: checked });
            chrome.storage.sync.set({ analyticsOptIn: checked });
          }}
        />
        <label
          className="form-check-label"
          htmlFor="send-anonymous-check"
          style={{ color: "white" }}
        >
          Send Anonymous Analytics Data to Improve TextGrab
        </label>
      </div>
      <div className="btns" id="options-btn-layout">
        <button
          className={`tg-button ${saveBtnEnabled ? "" : "disabled"}`}
          id="save-btn"
          onClick={onSaveClick}
          disabled={!saveBtnEnabled}
        >
          Save
        </button>
        <button
          className="tg-button"
          id="restore-defaults-btn"
          onClick={onResetClick}
        >
          Reset to Defaults
        </button>
      </div>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <OptionsPage />
  </React.StrictMode>,
  document.getElementById("root")
);
