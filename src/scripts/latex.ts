import { trackEvent } from "../services/analytics";
import { APIError } from "./errors";
import { callGetLatexAPI } from "../services/api";
import { showToast } from "./ui/toast";
import { getSelection, crop } from './selection'

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
        await new Promise<void>((resolve) =>
            setTimeout(() => {
                resolve();
            }, 100)
        );

        const screenshotURL = await new Promise<string>((resolve, reject) => {
            chrome.runtime.sendMessage(
                {
                    type: "getTabScreenshot",
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve(response.screenshot);
                }
            );
        });

        const croppedImage = await crop(screenshotURL, selection);
        trackEvent("ui_event", "crop", "success");
        let apiResponse;
        try {
            apiResponse = await callGetLatexAPI(croppedImage);
        } catch (e) {
            console.error(e);
            if (e instanceof APIError) {
                trackEvent("API", "latex_api_error", e.message);
                showToast(e.message, "error");
            } else {
                trackEvent("API", "latex_api_error", String(e));
                showToast(
                    "Oops! Something went wrong when reaching the server. Please try again later.",
                    "error"
                );
            }
            return;
        }
        console.log(apiResponse);
        navigator.clipboard
            .writeText(apiResponse.latex)
            .then(() => {
                showToast("Selected Latex has been copied to clipboard!", "success");
            })
            .catch(() => {
                showToast("Error copying to clipboard", "error");
            });
    })();
}
main();
