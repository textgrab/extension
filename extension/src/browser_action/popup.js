function validateImage(image) {
  // check the type
  var validTypes = ["image/jpeg", "image/png"];
  if (validTypes.indexOf(image.type) === -1) {
    alert("Invalid File Type");
    return false;
  }

  // check the size
  var maxSizeInBytes = 10e6; // 10MB
  if (image.size > maxSizeInBytes) {
    alert("File too large");
    return false;
  }

  return true;
}

function getBase64Data(blob) {
  return new Promise((resolve, reject) => {
    // read the image...
    var reader = new FileReader();
    reader.onload = function (e) {
      resolve(e.target.result);
    };
    reader.onerror = function (e) {
      reject(e);
    };
    reader.readAsDataURL(blob);
  });
}

function handleFiles(files) {
  if (files.length !== 1) {
    alert("Please select only one image");
    return;
  }
  let file = files[0];
  if (!validateImage(file)) return;

  getBase64Data(file);
}

function handleDrop(e) {
  var dt = e.dataTransfer,
    files = dt.files;

  if (files.length) {
    handleFiles(files);
  } else {
    // check for img
    var html = dt.getData("text/html"),
      match = html && /\bsrc="?([^"\s]+)"?\s*/.exec(html),
      url = match && match[1];

    if (url) {
      uploadImageFromURL(url);
      return;
    }
  }

  function uploadImageFromURL(url) {
    var img = new Image();
    var c = document.createElement("canvas");
    var ctx = c.getContext("2d");

    img.onload = function () {
      c.width = this.naturalWidth; // update canvas size to match image
      c.height = this.naturalHeight;
      ctx.drawImage(this, 0, 0); // draw in image
      c.toBlob(function (blob) {
        // call our main function
        handleFiles([blob]);
      }, "image/png");
    };
    img.onerror = function () {
      alert("Error in capturing image");
    };
    img.crossOrigin = ""; // if from different origin
    img.src = url;
  }
}

async function main() {
  const button = document.getElementById("capture-btn");

  button.addEventListener(
    "click",
    () => {
      // Launch the screen capture
      button.innerHTML = "Capturing...";

      // null tab ID means use active tab
      document.getElementById("description-btm").innerHTML =
        "Click out of this dialog and click on an image/video to capture text";
      chrome.runtime.sendMessage({ myPopupIsOpen: true });
    },
    false
  );

  var fakeInput = document.createElement("input");
  fakeInput.type = "file";
  fakeInput.accept = "image/*";
  fakeInput.multiple = true;

  var dropRegion = document.getElementById("drop-region");

  dropRegion.addEventListener("click", function () {
    fakeInput.click();
  });

  fakeInput.addEventListener("change", function () {
    var files = fakeInput.files;
    handleFiles(files);
  });

  function preventDefault(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  dropRegion.addEventListener("dragenter", preventDefault, false);
  dropRegion.addEventListener("dragleave", preventDefault, false);
  dropRegion.addEventListener("dragover", preventDefault, false);
  dropRegion.addEventListener("drop", preventDefault, false);

  dropRegion.addEventListener("drop", handleDrop, false);
}
document.addEventListener("DOMContentLoaded", main, false);
