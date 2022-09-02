import { APIError } from "../scripts/errors";
import { trackEvent } from "./analytics";

async function postAPI(endpoint: string, payload: any) {
  const startTime = performance.now();
  // to remove the 22 characters before the image data
  const res = await fetch(`${process.env.API_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const content = await res.json();

  if (
    Object.prototype.hasOwnProperty.call(content, "error") &&
    content.error.message
  ) {
    throw new APIError(content.error.message);
  }
  const duration = performance.now() - startTime;
  trackEvent("API", endpoint, "duration", Math.round(duration));
  return content;
}

/**
 * @param {str} data Image data to send to the API
 * @returns JSON object of response of API /process
 */
export async function callGetTextBlocksAPI(
  data: string,
  preserveIndentation: boolean,
  isolateBlocks: boolean
) {
  // to remove the 22 characters before the image data
  data = data.substring(22);
  return postAPI("process", {
    imageData: data,
    preserveIndentation: preserveIndentation,
    isolateBlocks: isolateBlocks
  });
}


/**
 * 
 * @param data Image data for latex image to be sent to API
 * @returns JSON object of API /latex
 */
export async function callGetLatexAPI(
  data: string
) {
  // to remove the 22 characters before the image data
  data = data.substring(22);
  return postAPI("latex", {
    imageData: data
  });
}
