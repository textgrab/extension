/**
 *
 * @param message to display in toast
 * @param type one of error, info, success. Default is info
 */
export function showToast(message: string, type = "info", duration = 3000) {
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