{
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
    constructor(target) {
      this.renderedRects = [];
      this.spinner = null;
      this.target = target;
    }

    getTargetOffsets() {
      // calculate offsets of target to position text at proper position
      // and account for scroll
      let leftOffset =
        this.target.getBoundingClientRect().left +
        (window.pageXOffset || document.documentElement.scrollLeft);
      let topOffset =
        this.target.getBoundingClientRect().top +
        (window.pageYOffset || document.documentElement.scrollTop);

      return { left: leftOffset, top: topOffset };
    }

    /**
     * Inserts HTML elements into the DOM for each Rect
     * @param {Array<Rect>} rects list of Rects to display
     */
    showRects(rects) {
      // clear the previous rects
      this.clear();

      // calculate offsets of target to position text at proper position
      const { left: leftOffset, top: topOffset } = this.getTargetOffsets();

      for (var i = 0; i < rects.length; i++) {
        let rect = rects[i];
        if (!rect.value) continue;

        let text = document.createElement("div");
        text.style.position = "absolute";
        text.innerHTML = rect.value;
        text.style.left = rect.x + leftOffset + "px";
        text.style.top = rect.y + topOffset + "px";
        text.style.textAlign = "center";
        text.style.color = "transparent";

        text.style.backgroundColor = "rgba(72, 167, 250, 0.221)";

        text.style.setProperty("z-index", "2147483637", "important");
        text.style.userSelect = "text";
        text.style.fontSize = `${rect.height}px`;
        document.body.appendChild(text);
        // text.style.transform = `scale(${rect.width / text.offsetWidth}, 1)`;
        this.renderedRects.push(text);
      }
    }

    /**
     * Clears all the rects off the screen
     */
    clear() {
      this.renderedRects.forEach((val) => {
        document.body.removeChild(val);
      });
      this.renderedRects = [];
      this.showSpinner(false);
    }

    // Target element is needed to insert the spinner on top of the element properly
    showSpinner(show) {
      if (this.spinner != null) {
        this.target.parentElement.removeChild(this.spinner);
        this.spinner = null;
      }
      if (show) {
        let { left, top } = this.getTargetOffsets();
        left += 10;
        top += 10;
        let loader = document.createElement("div");
        loader.className = "textgrab-loader";
        loader.style.position = "absolute";
        // loader.style.setProperty("z-index", "2147483637", "important");
        // loader.style.left = left + "px";
        // loader.style.top = top + "px";
        // document.body.appendChild(loader);
        this.target.parentElement.insertBefore(loader, this.target.nextElementSibling);
        this.spinner = loader;
      }
    }

    toggleClearButton(show) {
      if (show) {
        let { left, top } = this.getTargetOffsets();
        left += 10;
        top += 10;
        // Create button element
        let clearBtn = document.createElement("button");
        clearBtn.className = "textgrab-clear-btn";
        clearBtn.style.position = "absolute";
        clearBtn.style.setProperty("z-index", "2147483637", "important");
        // clearBtn.style.left = left + "px";
        // clearBtn.style.top = top + "px";
        // clearBtn.style.width = "4em"
        // clearBtn.style.height = "2em"
        clearBtn.innerHTML = "Clear"

        // Add clear behaviour
        clearBtn.addEventListener("mousedown", () => {
          this.clear();
          this.toggleClearButton(false);
        })
        // document.body.appendChild(clearBtn);
        this.target.parentElement.insertBefore(clearBtn, this.target.nextElementSibling);
        this.clearBtn = clearBtn;
      }
      // Disable the button
      else {
        this.target.parentElement.removeChild(this.clearBtn)
        this.clearBtn = null;
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
        this.image.onload = () => {
          resolve(createImageBitmap(this.image));
        };
        this.image.onerror = () => reject("Image error");
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

  /**
   * @param {str} data Image data to send to the API
   * @returns JSON object of response of API /process
   */
  async function getProcessedBoundingRects(data) {
    // to remove the 22 characters before the image data
    data = data.substr(22);
    let res = await fetch("https://api.textgrab.io/process", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageData: data }),
    });
    const content = await res.json();
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

      // window.addEventListener("click", handleClick, false);
      let elements = document.querySelectorAll("img,video");
      elements.forEach((el) => {
        el.classList.add(MOUSE_VISITED_CLASSNAME);
        el.addEventListener("click", handleClick);
      });

      function handleClick(e) {
        // window.removeEventListener("click", handleClick);

        e.srcElement.removeEventListener("click", handleClick);
        elements.forEach((el) => {
          el.classList.remove(MOUSE_VISITED_CLASSNAME);
          el.removeEventListener("click", handleClick);
        });

        // let srcElement = document.elementFromPoint(e.x, e.y);
        let res = getTargetHelper(e.srcElement, ghostElement);
        e.preventDefault();
        e.stopPropagation();
        if (res == null) {
          reject("Selected element is not supported");
        } else {
          resolve(res);
        }
        return false;
      }
    });
  }

  /**
   * Recursive DFS search for any valid node that is a video or image element
   * @param {HTMLElement} root
   * @param {HTMLElement} ghostElement (used only to create {Image} or {Video} instances)
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

  function main() {
    // set up ghost canvas to put the image (we need this in order to get base64 string)
    var ghost = document.createElement("canvas");
    ghost.style.position = "absolute";
    ghost.style.display = "none";
    document.body.appendChild(ghost);

    (async function () {
      // get the video / image target if it exists
      let target = await getTarget(ghost);
      console.log("Target", target);
      if (target == null) return;

      // set up the renderer on the target element
      let renderer = new Renderer(target.getHTMLElement());
      renderer.showSpinner(true);

      let response, image;

      try {
        image = await target.getBase64Data();

        // Hit API and update extension
        response = await getProcessedBoundingRects(image.data);
      } catch (e) {
        console.error(e);
        renderer.clear();
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

      // Show the results via a text overlay to the user
      renderer.showRects(selectedRects);

      const REFRESH_RATE = 5000;

      let mousedown = false;
      window.addEventListener("mousedown", () => {
        mousedown = true;
      });
      window.addEventListener("mouseup", () => {
        mousedown = false;
      });
      // we clear the text overlay after x amount of seconds
      // and until user mouse is not down
    //   setTimeout(() => {
    //     const clear = () => {
    //       setTimeout(() => {
    //         renderer.clear();
    //         window.removeEventListener("mouseup", clear);
    //       }, 1500);
    //     };
    //     if (mousedown) {
    //       window.addEventListener("mouseup", clear);
    //     } else {
    //       clear();
    //     }
    //   }, REFRESH_RATE);
    renderer.toggleClearButton(true);

    })();
  }
}
main();
