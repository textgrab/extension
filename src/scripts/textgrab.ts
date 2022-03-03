import { loadUserPrefs } from "../services/preferences";
import { trackEvent } from "../services/analytics";
import Renderer, { Target, Video, Image, Canvas } from "./renderer";
import { Rect, Line, Block } from "./models";
import { APIError } from "./errors";
import { callGetTextBlocksAPI } from "../services/api";
import { showToast } from "./ui/toast";

/**
 * Checks whether an event occurred within a given element
 * @param {Event} e : the event object
 * @param {any} rect - bounding box of the HTML element
 * @returns
 */
function checkEventInRect(e: MouseEvent, rect: DOMRect) {
  return (
    e.x >= rect.left &&
    e.x <= rect.right &&
    e.y >= rect.top &&
    e.y <= rect.bottom
  );
}

/**
 * Returns the target (either Video or Image) after user selects it.
 * We recursively walk the tree to find a video/img element from a click event
 * or raise an error if no element is found.
 * @param {HTMLElement} ghostElement : The ghost canvas used to get the base64 version of an image
 * @returns {Promise<Video | Image | Canvas>}
 */
function getTarget(
  ghostElement: HTMLCanvasElement
): Promise<Target<HTMLElement> | null> {
  return new Promise<Target<HTMLElement> | null>(function (resolve, reject) {
    // Unique ID for the className.
    const MOUSE_VISITED_CLASSNAME = "crx_mouse_visited";
    window.focus();

    window.addEventListener("click", handleGlobalClick, {
      once: true,
    });

    const elements = document.querySelectorAll("img,video,canvas");
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
          if (document.activeElement?.tagName === "IFRAME") {
            trackEvent("ui_event", "selection_error", "iframe");
            cancelSelection();
            reject(
              "Due to security measures, TextGrab cannot access content within an iframe HTML element. Please use the Snip Tool to select text."
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
    function handleKeyPress(e: KeyboardEvent) {
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
    function handleElementClick(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      cancelSelection();
      let res = null;
      if (e.target)
        res = getTargetFromChildren(e.target as Element, ghostElement);
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
    function handleGlobalClick(e: MouseEvent) {
      e.preventDefault();
      cancelSelection();
      // First check the elements that we know are valid
      for (let i = 0; i < elements.length; i++) {
        const boundingRect = elements[i].getBoundingClientRect();
        // check if the click is within the bounding box of the element
        if (checkEventInRect(e, boundingRect)) {
          const res = getTargetFromChildren(elements[i], ghostElement);
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
      const elementsAtPoint = document.elementsFromPoint(e.x, e.y);

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
      document.removeEventListener("keydown", handleKeyPress);
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
function getTargetFromParents(
  candidates: Element[],
  ghostElement: HTMLCanvasElement
): Target<HTMLElement> | null {
  if (!candidates || candidates.length == 0) return null;
  let overflow: Element[] = [];
  for (let i = 0; i < candidates.length; i++) {
    switch (candidates[i].nodeName) {
      case "VIDEO":
        return new Video(candidates[i] as HTMLVideoElement, ghostElement);
      case "IMAGE":
        return new Image(candidates[i] as HTMLImageElement, ghostElement);
      case "CANVAS":
        return new Canvas(candidates[i] as HTMLCanvasElement, ghostElement);
      default:
        if (candidates[i].shadowRoot) {
          overflow = overflow.concat(
            Array.from(candidates[i].shadowRoot?.children || [])
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
 * @returns {Video | Image | Canvas | null}
 */
function getTargetFromChildren(
  root: Element,
  ghostElement: HTMLCanvasElement
): Target<HTMLElement> | null {
  if (root == null) return null;
  switch (root.nodeName) {
    case "VIDEO":
      return new Video(root as HTMLVideoElement, ghostElement);
    case "IMG":
      return new Image(root as HTMLImageElement, ghostElement);
    case "CANVAS":
      return new Canvas(root as HTMLCanvasElement, ghostElement);
    default: {
      let children = Array.from(root.children);
      // On D2L, video is nested within shadowRoot for some reason
      // so we add those children as well
      if (root.shadowRoot) {
        children = children.concat(Array.from(root.shadowRoot.children));
      }

      // walk through the children
      for (let i = 0; i < children.length; i++) {
        const element = getTargetFromChildren(children[i], ghostElement);
        if (element != null) return element;
      }

      return null;
    }
  }
}

/**
 * Does the heavy-lifting of getting the text from the element
 * by hitting the API, and converting its response into {Block}s
 * @param {HTMLElement} target
 * @param {Renderer} renderer
 * @returns
 */
async function getTextBlocksForTarget(
  target: Target<HTMLElement>,
  renderer: Renderer
) {
  let response, image: { data: string; width: number; height: number };

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
      "Host does not allow manipulation of this image's content. Please use the Snip Tool instead!",
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

  const blocks: Block[] = [];
  let numRects = 0;
  type LineAPI = { bounding_box: DOMRect, text: string }
  type BlockAPI = { lines: LineAPI[], bounding_box: DOMRect }
  response.blocks.forEach((block: BlockAPI) => {
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

    const lines = block.lines.map((line: LineAPI) => {
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
 */
function showMenu(
  target: Target<HTMLElement>,
  renderer: Renderer,
  full_text: string
) {
  const startTime = performance.now();
  renderer.toggleMenu(
    true,
    async () => {
      try {
        await navigator.clipboard.writeText(full_text);
        showToast("Copied all text to clipboard!", "success");
        trackEvent("buttons", "menu", "copy_all");
      } catch (e) {
        showToast("Failed to copy text to clipboard", "error");
      }
    },
    async () => {
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
    }
  );
}

function main() {
  // set up ghost canvas to put the image (we need this in order to get base64 string)
  const ghost = document.createElement("canvas");
  ghost.id = "textgrab-ghost-1";
  ghost.style.position = "absolute";
  ghost.style.display = "none";
  document.documentElement.appendChild(ghost);

  const ghostForMeasuringText = document.createElement("canvas");
  ghostForMeasuringText.id = "textgrab-ghost-2";
  ghostForMeasuringText.style.position = "absolute";
  ghostForMeasuringText.style.display = "none";
  document.documentElement.appendChild(ghostForMeasuringText);

  (async function () {
    // load user settings
    const settings = await loadUserPrefs();

    // get the video / image target if it exists
    let target;
    try {
      target = await getTarget(ghost);
      console.log("Target", target);
      if (target == null) return;
    } catch (e) {
      showToast(String(e), "error", 4000);
      return;
    }

    trackEvent("ui_event", "target_found", target.getHTMLElement().nodeName);

    // set up the renderer on the target element
    const renderer = new Renderer(
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
          document.documentElement.removeChild(ghost);
          document.documentElement.removeChild(ghostForMeasuringText);
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false });
        }
      }
    }
    );
  })();
}
main();
