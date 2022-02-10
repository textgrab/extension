// import * as Tesseract from "./tesseract.js";
class Image {
  constructor(htmlElement, ghostCanvas) {
    this.image = htmlElement;
    this.ghostCanvas = ghostCanvas;
  }
  async getBase64Data() {
    // to allow for manipulation of images with CORS restrictions
    this.image.crossOrigin = "anonymous";
    let frame = await new Promise((resolve, reject) => {
      this.image.onload = async () => {
        let bitmap = await createImageBitmap(this.image);
        resolve(bitmap);
      };
      this.image.onerror = (e) =>
        reject(`Error retrieving image: ${String(e)}`);
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

// const Tesseract = require("./tesseract.js");
const { createWorker } = Tesseract;
const worker = Tesseract.createWorker();

// let imageBuffer = Buffer.from(base64, "base64");

(async () => {
  const startTime = performance.now();
  await worker.load();
  console.log("Loaded in", performance.now() - startTime, "ms");
  await worker.loadLanguage("eng");
  console.log("Loaded language in", performance.now() - startTime, "ms");
  await worker.initialize("eng");
  console.log("Initialized in", performance.now() - startTime, "ms");
  const image = document.getElementById("test-image");
  var tempCanvas = document.createElement("canvas");
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;

  var drawingCanvas = document.createElement("canvas");
  drawingCanvas.width = image.width;
  drawingCanvas.height = image.height;
  drawingCanvas.style.position = "absolute";
  drawingCanvas.style.top = image.offsetTop + "px";
  drawingCanvas.style.left = image.offsetLeft + "px";
  // {x0: 603, y0: 4, x1: 624, y1: 18}
  var drawer = drawingCanvas.getContext("2d");

  var context = tempCanvas.getContext("2d");
  context.drawImage(image, 0, 0, image.width, image.height);
  const data = await worker.recognize(tempCanvas);

  console.log(data.data.lines);
  for (let i = 0; i < data.data.lines.length; i++) {
    for (let j = 0; j < data.data.lines[i].words.length; j++) {
      const bbox = data.data.lines[i].words[j].bbox;
      console.log(bbox);
      drawer.beginPath();
      drawer.strokeStyle = "red";
      drawer.rect(bbox.x0, bbox.y0, bbox.x1 - bbox.x0, bbox.y1 - bbox.y0);
      drawer.stroke();
    }
  }
  document.body.appendChild(drawingCanvas);

  document.getElementById("result").innerHTML = data.data.hocr;
  console.log("Recognized in", performance.now() - startTime, "ms");
  console.log(data);
  await worker.terminate();
})();
