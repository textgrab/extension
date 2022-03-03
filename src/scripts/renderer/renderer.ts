import { Options } from "../../services/preferences";
import { Block, Line } from "../models";

// TODO: This is a temporary solution
import { trackEvent } from "../../services/analytics";

export class Renderer {
  readonly font: string = "arial";

  private renderedBlocks: HTMLElement[];
  private spinner: HTMLElement | null;
  private menu: HTMLElement | null;
  private target: HTMLElement;
  private config: Options;

  private ghostCanvas: HTMLCanvasElement;

  /**
   * @param {HTMLElement} target the element to display the text on
   * @param {HTMLCanvasElement} canvas the canvas used to measure the text
   */
  constructor(target: HTMLElement, canvas: HTMLCanvasElement, config: Options) {
    this.renderedBlocks = [];
    this.spinner = null;
    this.menu = null;
    this.target = target;
    this.config = config;

    // used for measuring text (cannot use the same as video canvas)
    this.ghostCanvas = canvas;
  }

  /**
   * Calculate the offset of the target element in order
   * to position the text overlay at the correct position
   */
  getTargetOffsets(): { left: number; top: number } {
    const leftOffset =
      this.target.getBoundingClientRect().left +
      (window.pageXOffset || document.documentElement.scrollLeft);
    const topOffset =
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
  getTextWidth(text: string, size: number) {
    // Computes the width of the text in pixels
    const context = this.ghostCanvas.getContext("2d");
    if (context == null) {
      throw new Error("Could not get context for canvas");
    }
    context.font = size + "px " + this.font;
    const metrics = context.measureText(text);
    return metrics.width;
  }

  showBlocks(blocks: Block[]) {
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
      blockElement.style.margin = "0px";
      blockElement.style.setProperty("z-index", "2147483636", "important");

      document.documentElement.appendChild(blockElement);
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
        if (!lineElement) continue;

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
   * Creates a line element in the block
   */
  createLineInBlock(line: Line, offsetY: number): HTMLElement | null {
    if (!line.text || line.text.length == 0) return null;
    const rect = line.rect;

    const textWidth = this.getTextWidth(line.text, rect.height);

    // letter spacing also adds a space at the end of text
    // thus we need line.text.length instead of line.text.length - 1
    const letterSpacing = (rect.width - textWidth) / line.text.length;
    const text = document.createElement("div");

    text.style.position = "relative";
    text.innerText = line.text;
    text.style.width = rect.width + "px";
    text.style.height = rect.height + "px";

    text.style.left = rect.x + "px";
    text.style.top = offsetY + "px";
    text.style.padding = "0px";
    text.style.margin = "0px";
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
      document.documentElement.removeChild(val);
    });
    this.renderedBlocks = [];
    this.toggleSpinner(false);
    this.toggleMenu(false);
  }

  /**
   * Shows or hides the spinner on the element
   * @param {Boolean} show whether to show or hide the spinner
   */
  toggleSpinner(show: boolean) {
    if (this.spinner != null) {
      document.documentElement.removeChild(this.spinner);
      this.spinner = null;
    }
    if (show) {
      let { left, top } = this.getTargetOffsets();
      left += 10;
      top += 10;
      const loader = document.createElement("div");
      loader.id = "textgrab-loader";
      loader.style.position = "absolute";
      loader.style.setProperty("z-index", "2147483637", "important");
      loader.style.left = left + "px";
      loader.style.top = top + "px";
      document.documentElement.appendChild(loader);
      this.spinner = loader;
    }
  }

  /**
   * Shows or hides the clear button
   * @param {Boolean} show whether to show or hide the clear button
   */
  toggleMenu(
    show: boolean,
    onCopyAll = () => {
      /* no-op */
    },
    onRecapture = () => {
      /* no-op */
    }
  ) {
    if (this.menu != null) {
      document.documentElement.removeChild(this.menu);
      this.menu = null;
    }
    if (show) {
      let { left, top } = this.getTargetOffsets();
      left += 10;
      top += 10;

      // create the menu
      const menu = document.createElement("div");
      menu.id = "textgrab-menu";
      menu.style.left = left + "px";
      menu.style.top = top + "px";

      // Create clear button
      const clearBtn = document.createElement("button");
      clearBtn.id = "textgrab-clear-btn";
      clearBtn.className = "textgrab-btn-1";
      clearBtn.innerText = "Clear Selection";

      // Create copy all button
      const copyAll = document.createElement("button");
      copyAll.id = "textgrab-copy-btn";
      copyAll.className = "textgrab-btn-1";
      copyAll.innerText = "Copy All";
      copyAll.style.marginTop = "5px";

      // Create recapture button
      const recaptureBtn = document.createElement("button");
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
      document.documentElement.appendChild(menu);
      this.menu = menu;
      this.dragElement(menu);
    }
  }

  dragElement(elmnt: HTMLElement) {
    /* https://www.w3schools.com/howto/howto_js_draggable.asp */

    let pos1X = 0,
      pos1Y = 0,
      pos2X = 0,
      pos2Y = 0;

    elmnt.onmousedown = dragMouseDown;
    const localTarget = this.target;

    function dragMouseDown(e: MouseEvent) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos1X = e.clientX;
      pos1Y = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }

    function elementDrag(e: MouseEvent) {
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
