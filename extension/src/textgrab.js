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
    }
  }

  class Line {
    /**
     * A line represents a rectangle with text in it.
     * @param {Rect} rect
     * @param {String} text
     */
    constructor(rect, text = "") {
      this.rect = rect;
      this.text = text;
    }
  }

  class Block {
    /**
     * A block is a block of related text. This sort of like a paragraph
     * in the sense it has multiple lines in close proximity.
     * @param {Rect} rect
     * @param {Array<Line>} lines
     */
    constructor(rect, lines = []) {
      this.rect = rect;
      this.lines = lines;
    }
  }

  class Renderer {
    /**
     * @param {HTMLElement} target the element to display the text on
     * @param {HTMLCanvasElement} canvas the canvas used to measure the text
     */
    constructor(target, canvas, config) {
      this.renderedBlocks = [];
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
     *
     * @param {Array<Block>} blocks
     */
    showBlocks(blocks) {
      this.clear();
      const { left: leftOffset, top: topOffset } = this.getTargetOffsets();
      let error = 0;
      let numRects = 0;
      blocks.forEach((block) => {
        const blockElement = document.createElement("div");
        blockElement.style.position = "absolute";
        blockElement.style.left = block.rect.x + leftOffset + "px";
        blockElement.style.top = block.rect.y + topOffset + "px";
        blockElement.style.width = block.rect.width + "px";
        blockElement.style.height = block.rect.height + "px";
        blockElement.style.setProperty(
          "backgroundColor",
          "rbga(0,0,0,0)",
          "important"
        );

        // padding is used so user has some space between the word
        // and the border of the block to make selection easier
        blockElement.style.paddingRight = block.rect.width / 10 + "px";
        blockElement.style.paddingBottom = block.rect.height / 10 + "px";
        blockElement.style.margin = 0;
        blockElement.style.setProperty("z-index", "2147483636", "important");

        document.body.appendChild(blockElement);
        let lineElement = null;
        let yOffset = 0;
        // blockElement.style.border = "1px solid red";
        for (let i = 0; i < block.lines.length; i++) {
          const line = block.lines[i];
          yOffset +=
            lineElement == null
              ? line.rect.y
              : line.rect.y -
                block.lines[i - 1].rect.y -
                block.lines[i - 1].rect.height;

          lineElement = this.createLineInBlock(line, yOffset);
          error += Math.abs(
            line.rect.width - lineElement.getBoundingClientRect().width
          );
          blockElement.appendChild(lineElement);
          numRects += 1;
        }

        this.renderedBlocks.push(blockElement);
      });

      trackEvent(
        "ui_result",
        "process",
        "rect_accuracy",
        Math.round(error / numRects)
      );
      console.log("Mean Absolute Error: ", error / numRects);
    }

    /**
     *
     * @param {HTMLElement} parentElement
     * @param {Line} line
     * @returns {HTMLElement}
     */
    createLineInBlock(line, offsetY) {
      if (!line.text || line.text.length == 0) return;
      let rect = line.rect;

      let textWidth = this.getTextWidth(line.text, rect.height);

      // letter spacing also adds a space at the end of text
      // thus we need line.text.length instead of line.text.length - 1
      let letterSpacing = (rect.width - textWidth) / line.text.length;
      let text = document.createElement("div");

      text.style.position = "relative";
      text.innerText = line.text;
      text.style.width = rect.width + "px";
      text.style.height = rect.height + "px";

      text.style.left = rect.x + "px";
      text.style.top = offsetY + "px";
      text.style.padding = 0;
      text.style.margin = 0;
      text.style.whiteSpace = "nowrap";
      text.style.color = "transparent";

      text.style.setProperty(
        "background-color",
        this.config.highlightColor,
        "important"
      );

      text.style.setProperty("z-index", "2147483637", "important");
      text.style.userSelect = "text";
      text.style.fontSize = `${rect.height}px`;
      text.style.font = this.font;
      text.style.letterSpacing = `${letterSpacing}px`;

      return text;
    }
    /**
     * Clears all the rects off the screen
     */
    clear() {
      this.renderedBlocks.forEach((val) => {
        document.body.removeChild(val);
      });
      this.renderedBlocks = [];
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
        this.image.onerror = (e) =>
          reject(`Error retrieving image: ${String(e)}`);
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

  class Canvas {
    constructor(htmlElement, ghostCanvas) {
      this.canvas = htmlElement;
      this.ghostCanvas = ghostCanvas;
    }
    async getBase64Data() {
      return {
        data: this.canvas.toDataURL(),
        width: this.canvas.width,
        height: this.canvas.height,
      };
    }

    getHTMLElement() {
      return this.canvas;
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

  /**
   * Checks whether an event occurred within a given element
   * @param {Event} e : the event object
   * @param {any} rect - bounding box of the HTML element
   * @returns
   */
  function checkEventInRect(e, rect) {
    return (
      e.x >= rect.left &&
      e.x <= rect.right &&
      e.y >= rect.top &&
      e.y <= rect.bottom
    );
  }

  class APIError extends Error {
    constructor(message) {
      super(message);
      this.name = "APIError";
    }
  }

  /**
   * Returns the target (either Video or Image) after user selects it.
   * We recursively walk the tree to find a video/img element from a click event
   * or raise an error if no element is found.
   * @param {HTMLElement} ghostElement : The ghost canvas used to get the base64 version of an image
   * @returns {Promise<Video | Image | Canvas>}
   */
  function getTarget(ghostElement) {
    return new Promise(function (resolve, reject) {
      // Unique ID for the className.
      var MOUSE_VISITED_CLASSNAME = "crx_mouse_visited";
      window.focus();

      window.addEventListener("click", handleGlobalClick, {
        once: true,
      });

      let elements = document.querySelectorAll("img,video,canvas");
      elements.forEach((el) => {
        el.classList.add(MOUSE_VISITED_CLASSNAME);
        el.addEventListener("click", handleElementClick, {
          once: true,
        });
      });

      document.addEventListener("keydown", handleKeyPress);

      window.addEventListener(
        "blur",
        () => {
          setTimeout(() => {
            if (document.activeElement.tagName === "IFRAME") {
              trackEvent("ui_event", "selection_error", "iframe");
              cancelSelection();
              reject(
                "Due to security measures, TextGrab cannot access content within an iframe HTML element."
              );
            }
          });
        },
        { once: true }
      );

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
        let res = getTargetFromChildren(e.target, ghostElement);
        if (res == null) {
          trackEvent("ui_event", "cancel_selection", "window_click_target");
          reject("Please select an image or video element");
        } else {
          trackEvent("ui_event", "target_found_method", "normal_element");
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
        // First check the elements that we know are valid
        for (let i = 0; i < elements.length; i++) {
          const boundingRect = elements[i].getBoundingClientRect();
          // check if the click is within the bounding box of the element
          if (checkEventInRect(e, boundingRect)) {
            let res = getTargetFromChildren(elements[i], ghostElement);
            if (res != null) {
              trackEvent(
                "ui_event",
                "target_found_method",
                "global_element_click"
              );
              resolve(res);
              return;
            }
          }
        }

        // sorted from top most element (highest z-index) to lowest (usually html)
        let elementsAtPoint = document.elementsFromPoint(e.x, e.y);

        let res;

        // First check parents since that is generally faster
        res = getTargetFromParents(elementsAtPoint, ghostElement);
        if (
          res != null &&
          checkEventInRect(e, res.getHTMLElement().getBoundingClientRect())
        ) {
          trackEvent("ui_event", "target_found_method", "target_from_parents");
          return resolve(res);
        }

        // then check children
        const curElement = elementsAtPoint[0];
        res = getTargetFromChildren(curElement, ghostElement);
        if (
          res != null &&
          checkEventInRect(e, res.getHTMLElement().getBoundingClientRect())
        ) {
          trackEvent("ui_event", "target_found_method", "target_from_children");
          return resolve(res);
        }

        // otherwise, there is no element at the point that is valid
        trackEvent("ui_event", "cancel_selection", "window_click");
        reject("Please select an image or video element to select text from");
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
   * This function is usually passed a list of parents from a target element
   * and checks if any of the parents are a video or image element.
   * @param {Array<HTMLElement>} candidates : The list of elements to check
   * @param {Canvas} ghostElement used to create {Image} or {Video} instances
   * @returns
   */
  function getTargetFromParents(candidates, ghostElement) {
    if (!candidates || candidates.length == 0) return null;
    let overflow = [];
    for (i = 0; i < candidates.length; i++) {
      switch (candidates[i].nodeName) {
        case "VIDEO":
          return new Video(candidates[i], ghostElement);
        case "IMAGE":
          return new Image(candidates[i], ghostElement);
        case "CANVAS":
          return new Canvas(candidates[i], ghostElement);
        default:
          if (candidates[i].shadowRoot) {
            overflow = overflow.concat(
              Array.from(candidates[i].shadowRoot.children)
            );
          }
      }
    }

    return getTargetFromParents(overflow, ghostElement);
  }

  /**
   * Recursive DFS search for any valid node that is a video or image element
   * @param {HTMLElement} root
   * @param {Canvas} ghostElement used to create {Image} or {Video} instances
   * TODO: Narrow search by checking if the user's click is within the bounds of root
   * @returns {Video | Image | Canvas | null}
   */
  function getTargetFromChildren(root, ghostElement) {
    if (root == null) return null;
    switch (root.nodeName) {
      case "VIDEO":
        return new Video(root, ghostElement);
      case "IMG":
        return new Image(root, ghostElement);
      case "CANVAS":
        return new Canvas(root, ghostElement);
      default: {
        var children = Array.from(root.children);
        // On D2L, video is nested within shadowRoot for some reason
        // so we add those children as well
        if (root.shadowRoot) {
          children = children.concat(Array.from(root.shadowRoot.children));
        }

        // walk through the children
        for (var i = 0; i < children.length; i++) {
          let element = getTargetFromChildren(children[i], ghostElement);
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

  /**
   * Does the heavy-lifting of getting the text from the element
   * by hitting the API, and converting its response into {Block}s
   * @param {HTMLElement} target
   * @param {Renderer} renderer
   * @returns
   */
  async function getTextBlocksForTarget(target, renderer) {
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
      trackEvent("image", "get_base64_data_error", String(e));
      showToast(
        "Failed to get image data. This usually happens when the host doesn't allow manipulation of image content.",
        "error"
      );
      return;
    }

    // Hit the API with the image data to get rects
    try {
      response = await callGetTextBlocksAPI(image.data);
    } catch (e) {
      console.error(e);
      renderer.clear();
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

    const blocks = [];
    let numRects = 0;
    response.blocks.forEach((block) => {
      const blockBoundingBox = block.bounding_box;
      const targetRect = target.getHTMLElement().getBoundingClientRect();
      const wScale = targetRect.width / image.width;
      const hScale = targetRect.height / image.height;

      const block_rect = new Rect(
        blockBoundingBox.x * wScale,
        blockBoundingBox.y * hScale,
        blockBoundingBox.width * wScale,
        blockBoundingBox.height * hScale
      );

      const lines = block.lines.map((line) => {
        // calculate position relative to the block
        const line_rect = new Rect(
          (line.bounding_box.x - blockBoundingBox.x) * wScale,
          (line.bounding_box.y - blockBoundingBox.y) * hScale,
          line.bounding_box.width * wScale,
          line.bounding_box.height * hScale
        );
        numRects += 1;
        return new Line(line_rect, line.text);
      });
      blocks.push(new Block(block_rect, lines));
    });

    trackEvent("API", "api_success", "get_text_rects", numRects);

    return { blocks, full_text: response.full_text };
  }

  /**
   * Shows the menu on the target element.
   * TODO: Remove full_text and implement cleaner solution
   * @param {Image | Video | Canvas} target
   * @param {Renderer} renderer
   * @param {String} full_text
   */
  function showMenu(target, renderer, full_text) {
    const startTime = performance.now();
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
        const recaptureDelay = performance.now() - startTime;
        trackEvent(
          "ui_event",
          "recapture_interval",
          String(recaptureDelay),
          Math.round(recaptureDelay)
        );

        // we have to recapture the text for the target
        const response = await getTextBlocksForTarget(target, renderer);
        if (!response) return;
        const { blocks, full_text } = response;
        renderer.toggleSpinner(false);
        renderer.showBlocks(blocks);
        trackEvent("buttons", "menu", "recapture");
        showMenu(target, renderer, full_text);
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
      const response = await getTextBlocksForTarget(target, renderer);
      if (!response) return;
      const { blocks, full_text } = response;
      renderer.toggleSpinner(false);

      // Show the results via a text overlay to the user
      renderer.showBlocks(blocks);

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
