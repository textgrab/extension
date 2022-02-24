{
  class APIError extends Error {
    constructor(message) {
      super(message);
      this.name = "APIError";
    }
  }

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

  /**
   *
   * @param {String} message to display in toast
   * @param {String} type one of error, info, success. Default is info
   */
  function showToast(message, type = "info", duration = 3000) {
    var toast = document.createElement("div");
    toast.id = "textgrab-snackbar";
    toast.className = `tg-show tg-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.className = toast.className.replace("tg-show", "");
      setTimeout(function () {
        document.body.removeChild(toast);
      }, 1000);
    }, duration);
  }

  function getSelection() {
    return new Promise((resolve, reject) => {
      let [startX, startY] = [null, null];
      let overlay = null;
      let divElement = null;
      let oldOverflowValue = document.documentElement.style.overflow;
      let oldUserSelectValue = document.documentElement.style.userSelect;
      let oldCursorValue = document.documentElement.style.cursor;

      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.userSelect = "none";
      document.documentElement.style.cursor = "crosshair";

      overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.left = startX + "px";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.left =
        (window.pageXOffset || document.documentElement.scrollLeft) + "px";
      overlay.style.top =
        (window.pageYOffset || document.documentElement.scrollTop) + "px";
      overlay.style.zIndex = "2147483646";
      overlay.style.userSelect = "none";
      overlay.style.pointerEvents = "none";
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      overlay.style.cursor = "crosshair";
      document.documentElement.appendChild(overlay);

      const onMouseDown = (e) => {
        startX = e.x;
        startY = e.y;

        divElement = document.createElement("div");
        divElement.id = "selector";
        divElement.style.left = startX + "px";
        divElement.style.top = startY + "px";
        divElement.style.border = "1px solid white";
        divElement.style.position = "absolute";
        divElement.style.zIndex = "2147483647";
        divElement.style.userSelect = "none";
        divElement.style.pointerEvents = "none";
        divElement.style.backgroundColor = "rgba(112, 112, 112, 0.3)";
        overlay.appendChild(divElement);
      };
      const onMouseMove = (e) => {
        if (divElement == null) {
          return;
        }
        const newX = e.x;
        const newY = e.y;

        if (newX < startX) {
          divElement.style.left = newX + "px";
        } else {
          divElement.style.left = startX + "px";
        }

        if (newY < startY) {
          divElement.style.top = newY + "px";
        } else {
          divElement.style.top = startY + "px";
        }
        divElement.style.width = Math.abs(newX - startX) + "px";
        divElement.style.height = Math.abs(newY - startY) + "px";
      };
      const onMouseUp = (e) => {
        if (divElement == null) {
          return;
        }
        let result = {
          x: divElement.offsetLeft,
          y: divElement.offsetTop,
          width: divElement.offsetWidth,
          height: divElement.offsetHeight,
          parentWidth: document.documentElement.clientWidth,
          parentHeight: document.documentElement.clientHeight,
        };
        cancelSelection();
        resolve(result);
      };

      const cancelSelection = () => {
        if (overlay == null) return;
        document.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keypress", handleKeyPress);

        document.documentElement.removeChild(overlay);
        document.documentElement.style.overflow = oldOverflowValue;
        document.documentElement.style.userSelect = oldUserSelectValue;
        document.documentElement.style.cursor = oldCursorValue;
        startX = null;
        startY = null;
        overlay = null;
        divElement = null;
      };

      const handleKeyPress = (e) => {
        if (e.key == "Escape" || e.key == "Esc" || e.keyCode == 27) {
          trackEvent("ui_event", "cancel_selection", "ESC");
          cancelSelection();
          resolve(null);
        }
      };

      document.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("keydown", handleKeyPress);
    });
  }

  function crop(screenshotURL, selection) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      // scaled down
      canvas.width = selection.width;
      canvas.height = selection.height;

      let ctx = canvas.getContext("2d");
      const image = new Image();
      image.onload = async () => {
        const scaleX = image.width / selection.parentWidth;
        const scaleY = image.height / selection.parentHeight;
        ctx.drawImage(
          image,
          selection.x * scaleX,
          selection.y * scaleY,
          selection.width * scaleX,
          selection.height * scaleY,
          0,
          0,
          selection.width,
          selection.height
        );
        resolve(canvas.toDataURL());
      };
      image.onerror = (e) => {
        reject(e);
      };
      image.src = screenshotURL;
    });
  }

  /**
   * @param {str} data Image data to send to the API
   * @returns JSON object of response of API /process
   */
  async function callGetTextBlocksAPI(data) {
    const startTime = performance.now();
    // to remove the 22 characters before the image data
    data = data.substr(22);
    let res = await fetch("https://api.textgrab.io/process", {
      // let res = await fetch("http://localhost:8000/process", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageData: data }),
    });
    const content = await res.json();
    if (content.hasOwnProperty("error") && content.error.message) {
      throw new APIError(content.error.message);
    }
    const duration = performance.now() - startTime;
    trackEvent("API", "process", "duration", Math.round(duration));
    return content;
  }

  function main() {
    (async () => {
      const selection = await getSelection();
      if (!selection) {
        return;
      }
      if (selection.width < 10 || selection.height < 10) {
        showToast("Please choose a larger selection", "info");
        return;
      }

      // delay 100 ms to let the selection disappear
      await new Promise((resolve, reject) =>
        setTimeout(() => {
          resolve();
        }, 100)
      );

      const screenshotURL = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "getTabScreenshot",
          },
          (callback = (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            }
            resolve(response.screenshot);
          })
        );
      });

      const croppedImage = await crop(screenshotURL, selection);
      trackEvent("ui_event", "crop", "success");
      let apiResponse;
      try {
        apiResponse = await callGetTextBlocksAPI(croppedImage);
      } catch (e) {
        console.error(e);
        if (e instanceof APIError) {
          trackEvent("API", "api_error", e.message);
          showToast(e.message, "error");
        } else {
          trackEvent("API", "api_error", String(e));
          showToast(
            "Oops! Something went wrong when reaching the server. Please try again later.",
            "error"
          );
        }
        return;
      }
      console.log(apiResponse.full_text);
      navigator.clipboard
        .writeText(apiResponse.full_text)
        .then((res) => {
          showToast("Copied selected text to clipboard!", "success");
        })
        .catch((err) => {
          showToast("Error copying to clipboard", "error");
        });
    })();
  }
}
main();
