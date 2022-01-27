{
  const OPTIONS = {
    highlightColor: "rgba(0,0,0,0)",
  };
  class Rect {
    constructor(x, y, width, height, value = null) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.value = value; // This is a special field to hold the text contained within the Rect
    }
  }

  class Renderer {
    /**
     * @param {HTMLElement} target the element to display the text on
     * @param {HTMLCanvasElement} canvas the canvas used to measure the text
     */
    constructor(target, canvas, config) {
      this.renderedRects = [];
      this.spinner = null;
      this.menu = null;
      this.target = target;
      this.font = "arial";
      this.config = config;

      // used for measuring text (cannot use the same as video canvas)
      this.ghostCanvas = canvas;
    }

    /**
     * Calculate the offset of the target element in order
     * to position the text overlay at the correct position
     * @returns {Object} left and top offsets of the target element
     */
    getTargetOffsets() {
      let leftOffset =
        this.target.getBoundingClientRect().left +
        (window.pageXOffset || document.documentElement.scrollLeft);
      let topOffset =
        this.target.getBoundingClientRect().top +
        (window.pageYOffset || document.documentElement.scrollTop);

      return { left: leftOffset, top: topOffset };
    }

    /**
     * Computes the width of the text in pixels
     * @param {String} text the content of text to measure
     * @param {Number} size the font size in pixels of the text
     * @returns the width of the text in pixels (can be float)
     */
    getTextWidth(text, size) {
      // Computes the width of the text in pixels
      var context = this.ghostCanvas.getContext("2d");
      if (context == null) {
        throw new Error("Could not get context for canvas");
      }
      context.font = size + "px " + this.font;
      var metrics = context.measureText(text);
      return metrics.width;
    }

    /**
     * Inserts HTML elements into the DOM for each Rect
     * @param {Array<Rect>} rects list of Rects to display
     */
    showRects(rects) {
      // calculate offsets of target to position text at proper position
      const { left: leftOffset, top: topOffset } = this.getTargetOffsets();
      let error = 0;
      for (var i = 0; i < rects.length; i++) {
        let rect = rects[i];
        if (!rect.value) continue;

        let textWidth = this.getTextWidth(rect.value, rect.height);

        // letter spacing also adds a space at the end of text
        // thus we need rect.value.length instead of rect.value.length - 1
        let letterSpacing = (rect.width - textWidth) / rect.value.length;

        let text = document.createElement("div");
        text.style.position = "absolute";
        text.innerText = rect.value;
        text.style.left = rect.x + leftOffset + "px";
        text.style.top = rect.y + topOffset + "px";
        text.style.padding = 0;
        text.style.margin = 0;
        text.style.color = "transparent";

        text.style.backgroundColor = this.config.highlightColor;

        text.style.setProperty("z-index", "2147483637", "important");
        text.style.userSelect = "text";
        text.style.fontSize = `${rect.height}px`;
        text.style.font = this.font;
        text.style.letterSpacing = `${letterSpacing}px`;
        document.body.appendChild(text);

        error += Math.pow(rect.width - text.offsetWidth, 2);
        this.renderedRects.push(text);
      }
      trackEvent(
        "ui_result",
        "process",
        "rect_accuracy",
        Math.round(error / this.renderedRects.length)
      );
      console.log("Total MSE: ", error / this.renderedRects.length);
    }

    /**
     * Clears all the rects off the screen
     */
    clear() {
      this.renderedRects.forEach((val) => {
        document.body.removeChild(val);
      });
      this.renderedRects = [];
      this.toggleSpinner(false);
      this.toggleMenu(false);
    }

    /**
     * Shows or hides the spinner on the element
     * @param {Boolean} show whether to show or hide the spinner
     */
    toggleSpinner(show) {
      if (this.spinner != null) {
        document.body.removeChild(this.spinner);
        this.spinner = null;
      }
      if (show) {
        let { left, top } = this.getTargetOffsets();
        left += 10;
        top += 10;
        let loader = document.createElement("div");
        loader.id = "textgrab-loader";
        loader.style.position = "absolute";
        loader.style.setProperty("z-index", "2147483637", "important");
        loader.style.left = left + "px";
        loader.style.top = top + "px";
        document.body.appendChild(loader);
        this.spinner = loader;
      }
    }

    /**
     * Shows or hides the clear button
     * @param {Boolean} show whether to show or hide the clear button
     */
    toggleMenu(show, onCopyAll = () => {}, onRecapture = () => {}) {
      if (this.menu != null) {
        document.body.removeChild(this.menu);
        this.menu = null;
      }
      if (show) {
        let { left, top } = this.getTargetOffsets();
        left += 10;
        top += 10;

        // create the menu
        let menu = document.createElement("div");
        menu.id = "textgrab-menu";
        menu.style.left = left + "px";
        menu.style.top = top + "px";

        // Create clear button
        let clearBtn = document.createElement("button");
        clearBtn.id = "textgrab-clear-btn";
        clearBtn.className = "textgrab-btn-1";
        clearBtn.innerText = "Clear Selection";

        // Create copy all button
        let copyAll = document.createElement("button");
        copyAll.id = "textgrab-copy-btn";
        copyAll.className = "textgrab-btn-1";
        copyAll.innerText = "Copy All";
        copyAll.style.marginTop = "5px";

        // Create recapture button
        let recaptureBtn = document.createElement("button");
        recaptureBtn.id = "textgrab-recapture-btn";
        recaptureBtn.className = "textgrab-btn-1";
        recaptureBtn.innerText = "Recapture";
        recaptureBtn.style.marginTop = "5px";

        // Add button listeners
        clearBtn.addEventListener("click", () => {
          this.clear();
          this.toggleMenu(false);
          trackEvent("buttons", "menu", "clear_selection");
        });

        copyAll.addEventListener("click", onCopyAll);
        recaptureBtn.addEventListener("click", onRecapture);

        menu.appendChild(clearBtn);
        menu.appendChild(copyAll);
        menu.appendChild(recaptureBtn);
        document.body.appendChild(menu);
        this.menu = menu;
        this.dragElement(menu);
      }
    }

    dragElement(elmnt) {
      /* https://www.w3schools.com/howto/howto_js_draggable.asp */

      var pos1X = 0,
        pos1Y = 0,
        pos2X = 0,
        pos2Y = 0;

      elmnt.onmousedown = dragMouseDown;
      let localTarget = this.target;

      function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos1X = e.clientX;
        pos1Y = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
      }

      function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos2X = pos1X - e.clientX;
        pos2Y = pos1Y - e.clientY;
        pos1X = e.clientX;
        pos1Y = e.clientY;
        // set the element's new position:
        elmnt.style.top = elmnt.offsetTop - pos2Y + "px";
        elmnt.style.left = elmnt.offsetLeft - pos2X + "px";
      }

      function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
        const finalRect = elmnt.getBoundingClientRect();
        const targetRect = localTarget.getBoundingClientRect();

        const centerX = finalRect.left + finalRect.width / 2;
        const centerY = finalRect.top + finalRect.height / 2;

        // we want to calculate the position in terms of percentage relative to the top left
        // corner of the target element to the center of the menu.
        const percentageX =
          ((centerX - (targetRect.left + finalRect.width / 2)) /
            (targetRect.width - finalRect.width)) *
          100;
        const percentageY =
          ((centerY - (targetRect.top + finalRect.height / 2)) /
            (targetRect.height - finalRect.height)) *
          100;
        trackEvent(
          "ui_event",
          "drag_menu",
          `${percentageX.toPrecision(5)} x% ; ${percentageY.toPrecision(5)} y%`,
          Math.round(percentageX)
        );
      }
    }
  }

  class Video {
    constructor(htmlElement, ghostCanvas) {
      this.video = htmlElement;
      this.ghostCanvas = ghostCanvas;
    }

    async getBase64Data() {
      // to allow for manipulation of videos with CORS restrictions
      this.video.crossOrigin = "anonymous";
      let stream = this.video.captureStream();
      let imageCapture = new ImageCapture(stream.getVideoTracks()[0]);
      let frame = await imageCapture.grabFrame();

      // set up off screen canvas
      var context = this.ghostCanvas.getContext("bitmaprenderer");
      const [frameWidth, frameHeight] = [frame.width, frame.height];
      context.transferFromImageBitmap(frame);

      return {
        data: this.ghostCanvas.toDataURL(),
        width: frameWidth,
        height: frameHeight,
      };
    }

    getHTMLElement() {
      return this.video;
    }
  }

  class Image {
    constructor(htmlElement, ghostCanvas) {
      this.image = htmlElement;
      this.ghostCanvas = ghostCanvas;
    }
    async getBase64Data() {
      // to allow for manipulation of images with CORS restrictions
      this.image.crossOrigin = "anonymous";
      let frame = await new Promise((resolve, reject) => {
        this.image.onload = async () => {
          let bitmap = await createImageBitmap(this.image);
          resolve(bitmap);
        };
        this.image.onerror = (e) => reject("Error retrieving image");
      });
      var context = this.ghostCanvas.getContext("bitmaprenderer");
      const [frameWidth, frameHeight] = [frame.width, frame.height];
      context.transferFromImageBitmap(frame);
      return {
        data: this.ghostCanvas.toDataURL(),
        width: frameWidth,
        height: frameHeight,
      };
    }

    getHTMLElement() {
      return this.image;
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
   * @param {str} data Image data to send to the API
   * @returns JSON object of response of API /process
   */
  async function getProcessedBoundingRects(data) {
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
    const duration = performance.now() - startTime;
    trackEvent("API", "process", "duration", Math.round(duration));
    return content;
  }

  /**
   * Returns the target (either Video or Image) after user selects it.
   * We recursively walk the tree to find a video/img element from a click event
   * or raise an error if no element is found.
   * @param {HTMLElement} ghostElement : The ghost canvas used to get the base64 version of an image
   * @returns {Promise<Video | Image>}
   */
  function getTarget(ghostElement) {
    return new Promise(function (resolve, reject) {
      // Unique ID for the className.
      var MOUSE_VISITED_CLASSNAME = "crx_mouse_visited";

      window.addEventListener("click", handleGlobalClick);

      let elements = document.querySelectorAll("img,video");
      elements.forEach((el) => {
        el.classList.add(MOUSE_VISITED_CLASSNAME);
        el.addEventListener("click", handleElementClick);
      });

      document.addEventListener("keydown", handleKeyPress);

      /**
       * We need to cancel selection when ESC is pressed
       * @param {Event} e
       */
      function handleKeyPress(e) {
        if (e.key == "Escape" || e.key == "Esc" || e.keyCode == 27) {
          trackEvent("ui_event", "cancel_selection", "ESC");
          cancelSelection();
          resolve(null);
        }
      }
      /**
       * This function is called when an element with the class name
       * MOUSE_VISITED_CLASSNAME is clicked. These should only be image or video
       * elements.
       * @param {Event} e
       */
      function handleElementClick(e) {
        e.preventDefault();
        e.stopPropagation();
        cancelSelection();
        let res = getTargetHelper(e.target, ghostElement);

        if (res == null) {
          trackEvent("ui_event", "cancel_selection", "window_click");
          reject("Please select an image or video element");
        } else {
          resolve(res);
        }
        return false;
      }

      /**
       * This function is called when the window is clicked anywhere and
       * serves as the fallback for when the click
       * on an element without class name MOUSE_VISITED_CLASSNAME,
       * is clicked.
       * @param {Event} e
       * @returns
       */
      function handleGlobalClick(e) {
        e.preventDefault();
        cancelSelection();

        let element = document.elementFromPoint(e.x, e.y);

        let res = getTargetHelper(element, ghostElement);
        if (!res) {
          trackEvent("ui_event", "cancel_selection", "window_click");
          reject("Please select an image or video element");
          return false;
        }

        // otherwise, we can resolve the promise
        // this is usually in the case of HTML elements
        // placed out of the document, e.g. shadow DOM
        // the outline will not show for these elements,
        // but it will still work
        resolve(res);
        return false;
      }

      /**
       * Cancels the selection of all video/image elements
       * and removes the event listeners
       */
      function cancelSelection() {
        elements.forEach((el) => {
          el.classList.remove(MOUSE_VISITED_CLASSNAME);
          el.removeEventListener("click", handleElementClick);
        });
        window.removeEventListener("click", handleGlobalClick);
        document.removeEventListener("keypress", handleKeyPress);
      }
    });
  }

  /**
   * Recursive DFS search for any valid node that is a video or image element
   * @param {HTMLElement} root
   * @param {HTMLElement} ghostElement (used only to create {Image} or {Video} instances)
   * TODO: Narrow search by checking if the user's click is within the bounds of root
   * @returns {Video | Image | null}
   */
  function getTargetHelper(root, ghostElement) {
    if (root == null) return null;
    switch (root.nodeName) {
      case "VIDEO":
        return new Video(root, ghostElement);
      case "IMG":
        return new Image(root, ghostElement);
      default: {
        var children = Array.from(root.children);
        // On D2L, video is nested within shadowRoot for some reason
        // so we add those children as well
        if (root.shadowRoot) {
          children = children.concat(Array.from(root.shadowRoot.children));
        }

        // walk through the children
        for (var i = 0; i < children.length; i++) {
          let element = getTargetHelper(children[i], ghostElement);
          if (element != null) return element;
        }

        return null;
      }
    }
  }

  /**
   *
   * @param {String} message to display in toast
   * @param {String} type one of error, info, success. Default is info
   */
  function showToast(message, type = "info") {
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
    }, 3000);
  }

  /**
   * Retrieves user's settings from chrome storage
   * @returns {Object} Preferences object
   */
  function loadUserSettings() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(OPTIONS, function (data) {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(data);
      });
    });
  }

  async function getTextRects(target, renderer) {
    let response, image;

    // get the image / video data from the target
    try {
      image = await target.getBase64Data();
      trackEvent(
        "image",
        "get_base64_data_success",
        target.getHTMLElement().nodeName
      );
    } catch (e) {
      console.error(e);
      renderer.clear();
      trackEvent("image", "get_base64_data_error", e.message);
      showToast(
        "Failed to get image data. This usually happens when the host doesn't allow manipulation of image content.",
        "error"
      );
      return;
    }

    // Hit the API with the image data to get rects
    try {
      response = await getProcessedBoundingRects(image.data);
    } catch (e) {
      console.error(e);
      renderer.clear();
      trackEvent("API", "api_error", e.message);
      showToast(
        "Oops! Something went wrong when reaching the server. Please try again later.",
        "error"
      );
      return;
    }

    console.log("Successful response");

    // convert API response into Rects
    var selectedRects = [];
    response.lines.forEach((line) => {
      const boundaryBox = line.bounding_box;
      const wScale = target.getHTMLElement().offsetWidth / image.width;
      const hScale = target.getHTMLElement().offsetHeight / image.height;
      selectedRects.push(
        new Rect(
          Math.round(boundaryBox.x * wScale),
          Math.round(boundaryBox.y * hScale),
          boundaryBox.width * wScale,
          boundaryBox.height * hScale,
          line.text
        )
      );
    });

    trackEvent("API", "api_success", "get_text_rects", selectedRects.length);

    return { rects: selectedRects, full_text: response.full_text };
  }

  /**
   * Shows the menu on the target element.
   * TODO: Remove full_text and implement cleaner solution
   * @param {Image | Video} target
   * @param {Renderer} renderer
   * @param {String} full_text
   */
  function showMenu(target, renderer, full_text) {
    renderer.toggleMenu(
      true,
      (onCopyAll = async () => {
        try {
          await navigator.clipboard.writeText(full_text);
          showToast("TextGrabbed successfully!", "success");
          trackEvent("buttons", "menu", "copy_all");
        } catch (e) {
          showToast("Failed to copy text to clipboard", "error");
        }
      }),
      (onRecapture = async () => {
        renderer.clear();
        renderer.toggleSpinner(true);
        let { rects, full_text } = await getTextRects(target, renderer);
        renderer.showRects(rects);
        renderer.toggleSpinner(false);
        trackEvent("buttons", "menu", "recapture");
        showMenu(target, renderer);
      })
    );
  }

  function main() {
    // set up ghost canvas to put the image (we need this in order to get base64 string)
    var ghost = document.createElement("canvas");
    ghost.id = "textgrab-ghost-1";
    ghost.style.position = "absolute";
    ghost.style.display = "none";
    document.body.appendChild(ghost);

    var ghostForMeasuringText = document.createElement("canvas");
    ghostForMeasuringText.id = "textgrab-ghost-2";
    ghostForMeasuringText.style.position = "absolute";
    ghostForMeasuringText.style.display = "none";
    document.body.appendChild(ghostForMeasuringText);

    (async function () {
      // load user settings
      let settings = await loadUserSettings();

      // get the video / image target if it exists
      let target;
      try {
        target = await getTarget(ghost);
        console.log("Target", target);
        if (target == null) return;
      } catch (e) {
        showToast(e, "error");
        return;
      }

      trackEvent("ui_event", "target_found", target.getHTMLElement().nodeName);

      // set up the renderer on the target element
      let renderer = new Renderer(
        target.getHTMLElement(),
        ghostForMeasuringText,
        settings
      );

      renderer.toggleSpinner(true);
      // get the rects
      let { rects, full_text } = await getTextRects(target, renderer);
      renderer.toggleSpinner(false);

      // Show the results via a text overlay to the user
      renderer.showRects(rects);

      // show menu
      showMenu(target, renderer, full_text);

      // to be able to cancel from background script
      chrome.runtime.onMessage.addListener(function (
        request,
        sender,
        sendResponse
      ) {
        if (request.type == "cancelCapture") {
          try {
            renderer.clear();
            document.body.removeChild(ghost);
            document.body.removeChild(ghostForMeasuringText);
            sendResponse({ success: true });
          } catch (e) {}
        }
      });
    })();
  }
}
main();
