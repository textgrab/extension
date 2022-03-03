import React, { useState } from "react";
import ReactDOM from "react-dom";
import { trackEvent } from "./services/analytics";

import Logo from "./assets/img/logo.svg";
import OptionsIcon from "./assets/img/options.svg";
import HelpIcon from "./assets/img/help-btn.svg";
import CoffeeIcon from "./assets/img/coffee-btn.svg";
import FallbackIcon from "./assets/img/fallback-btn.svg";

import "./assets/scss/main.scss";

const Popup = () => {
  const [captureBtnText, setCaptureBtnText] = useState("Capture Text");
  const [btmDescription, setBtmDescription] = useState(
    "Or use the shortcut Alt-C (Option-C). To use the Snip Tool, use Alt-T (Option-T)"
  );

  const onCaptureClick = () => {
    // Launch the screen capture
    setCaptureBtnText("Capturing...");

    setBtmDescription(
      "Click out of this dialog and click on an image/video to capture text"
    );
    chrome.runtime.sendMessage({ type: "captureBtn" });
    setTimeout(() => {
      window.close();
    }, 100);
  };

  const onFallbackClick = () => {
    trackEvent("buttons", "popup", "fallback_capture");

    chrome.runtime.sendMessage({
      type: "startFallback",
    });

    setTimeout(() => {
      window.close();
    }, 100);
  };

  const onHelpClick = () => {
    trackEvent("buttons", "popup", "help_btn");

    chrome.tabs.create({
      url: chrome.runtime.getURL("onboarding.html"),
    });
  };

  const onOptionsClick = () => {
    trackEvent("buttons", "popup", "settings_btn");
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("options.html"));
    }
  };

  const onCoffeeClick = () => {
    trackEvent("buttons", "popup", "donate_btn");
    chrome.tabs.create({
      url: "https://www.buymeacoffee.com/textgrab",
    });
  };

  return (
    <div className="container">
      <div className="logo-header popup-header">
        <img src={Logo} alt="logo" className="main-logo" />
        <h1 className="logo popup-title">TextGrab</h1>
        <img
          src={OptionsIcon}
          id="settings-btn"
          className="popup-mini-btn"
          title="Options"
          onClick={onOptionsClick}
        ></img>
        <img
          src={HelpIcon}
          id="help-btn"
          className="popup-mini-btn"
          title="Help"
          onClick={onHelpClick}
        ></img>
        <img
          src={CoffeeIcon}
          id="coffee-btn"
          className="popup-mini-btn"
          title="Buy TextGrab a Coffee"
          onClick={onCoffeeClick}
        ></img>
        <img
          src={FallbackIcon}
          id="fallback-btn"
          className="popup-mini-btn"
          title="Snip Tool Selection"
          onClick={onFallbackClick}
        ></img>
      </div>
      <div className="popup-content">
        <button id="capture-btn" onClick={onCaptureClick}>
          {captureBtnText}
        </button>
        <p id="description-btm" className="description">
          {btmDescription}
        </p>
      </div>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);
