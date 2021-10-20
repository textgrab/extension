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
      this.target = target;
    }

    /**
     * Inserts HTML elements into the DOM for each Rect
     * @param {Array<Rect>} rects list of Rects to display
     */
    showRects(rects) {
      // clear the previous rects
      this.clear();

      // calculate offsets of target to position text at proper position
      // accounting for scroll
      let leftOffset =
        this.target.getBoundingClientRect().left +
        (window.pageXOffset || document.documentElement.scrollLeft);
      let topOffset =
        this.target.getBoundingClientRect().top +
        (window.pageYOffset || document.documentElement.scrollTop);

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

        text.style.backgroundColor = "rgba(0, 0, 255, 0.2)";

        text.style.setProperty("z-index", "2147483638", "important");
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
      let frame = await createImageBitmap(this.image);
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
   * Returns the element the mouse is currently over. Requires mouse movement
   * This adds an event listener waiting for the mouse to move,
   * and then removes the event listener right away
   * @returns Promise<HTMLElement>
   */
  function getElementAtCursor() {
    return new Promise(function (resolve, reject) {
      let listener = (ev) => {
        let elementMouseIsOver = document.elementFromPoint(ev.x, ev.y);
        window.removeEventListener("mousemove", listener);
        resolve(elementMouseIsOver);
      };
      window.addEventListener("mousemove", listener);
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

  /**
   *  Returns the target (either <video> tag or <img> tag). Since getElementAtCursor
   *  returns the topmost element, we recursively walk the tree to find a video/img element
   *  or return null if no element is found
   * @param {HTMLElement} ghostElement : The ghost canvas used to get the base64 version of an image
   * @returns {Video | Image | null}
   */
  async function getTarget(ghostElement) {
    // get the topmost element that is at the same position as the cursor
    let elementAtCursor = await getElementAtCursor();
    let element = getTargetHelper(elementAtCursor, ghostElement);
    if (element != null) return element;

    // Fallback: just find any video on the site
    element = document.querySelector("video");
    if (element != null) return new Video(element, ghostElement);

    return null;
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
      let image = await target.getBase64Data();

      // Hit API and update extension
      let response = await getProcessedBoundingRects(image.data);
      chrome.runtime.sendMessage(response, function (response) {
        console.log("sending message");
      });

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

      const REFRESH_RATE = 7000;

      // we clear the text overlay after x amount of seconds
      setTimeout(() => {
        renderer.clear();
      }, REFRESH_RATE);
    })();
  }
}
main();
