import { APIError } from "../scripts/errors";
import { trackEvent } from "./analytics";

/**
 * @param {str} data Image data to send to the API
 * @returns JSON object of response of API /process
 */
export async function callGetTextBlocksAPI(data: string) {
  const startTime = performance.now();
  // to remove the 22 characters before the image data
  data = data.substring(22);
  const res = await fetch(`${process.env.API_URL}/process`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageData: data }),
  });
  const content = await res.json();

  if (
    Object.prototype.hasOwnProperty.call(content, "error") &&
    content.error.message
  ) {
    throw new APIError(content.error.message);
  }
  const duration = performance.now() - startTime;
  trackEvent("API", "process", "duration", Math.round(duration));
  return content;
}
