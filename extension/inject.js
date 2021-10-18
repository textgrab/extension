{
  class Rect {
    constructor(x, y, width, height, value = null) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.value = value;
    }

    repr() {
      return `${this.value}${this.x}${this.y}`;
    }
  }

  class Renderer {
    constructor(target) {
      this.renderedRects = [];
      this.target = target;
    }

    /**
     * Inserts HTML elements into the DOM for each Rect
     * @param {*} rects list of Rects
     */
    showRects(rects) {
      this.clear();
      console.log(
        document.body.getBoundingClientRect().top,
        this.target.getBoundingClientRect().top
      );
      let leftOffset =
        this.target.getBoundingClientRect().left +
        (window.pageXOffset || document.documentElement.scrollLeft);
      let topOffset =
        this.target.getBoundingClientRect().top +
        (window.pageYOffset || document.documentElement.scrollTop);

      for (var i = 0; i < rects.length; i++) {
        let rect = rects[i];
        if (rect.value) {
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
        // ctx.fillStyle = "rgba(129, 207, 224, 0.4)";

        // ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
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
      console.log("IMAGE", this.image);
      this.image.crossOrigin = "Anonymous";
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
   *
   * @param {str} data Image data
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
   *  Returns the target (either <video> tag or <img> tag)
   * @param {*} ghostElement : The ghost canvas used to get the base64 version of an image
   * @returns Video | Image
   */
  async function getTarget(ghostElement) {
    let elementAtCursor = await getElementAtCursor();
    switch (elementAtCursor.nodeName) {
      case "VIDEO":
        return new Video(elementAtCursor, ghostElement);
      case "IMG":
        return new Image(elementAtCursor, ghostElement);
      default: {
        let element = document.querySelector("video");
        if (element != null) return new Video(element, ghostElement);
        return null;
      }
    }
  }

  function main() {
    // set up ghost canvas to put the image
    var ghost = document.createElement("canvas");
    ghost.style.position = "absolute";
    ghost.style.display = "none";
    document.body.appendChild(ghost);

    (async function () {
      let target = await getTarget(ghost);
      console.log("HERE", target);
      if (target == null) return;

      let renderer = new Renderer(target.getHTMLElement());
      let image = await target.getBase64Data();

      console.log(image);

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

      renderer.showRects(selectedRects);

      setTimeout(() => {
        renderer.clear();
      }, 10000);
    })();
  }
}
main();
