export abstract class Target<T extends HTMLElement> {
  constructor(protected element: T, private ghostCanvas: HTMLCanvasElement) {}

  protected abstract getImageBitmap(): Promise<ImageBitmap>;

  public async getBase64Data(): Promise<{
    data: string;
    width: number;
    height: number;
  }> {
    const imageBitMap = await this.getImageBitmap();

    // set up off screen canvas
    const context = this.ghostCanvas.getContext("bitmaprenderer");
    if (!context) {
      throw new Error("Could not get context");
    }
    const [frameWidth, frameHeight] = [imageBitMap.width, imageBitMap.height];
    context.transferFromImageBitmap(imageBitMap);

    return {
      data: this.ghostCanvas.toDataURL(),
      width: frameWidth,
      height: frameHeight,
    };
  }

  public getHTMLElement(): T {
    return this.element;
  }
}

export class Video extends Target<HTMLVideoElement> {
  constructor(videoElement: HTMLVideoElement, ghostCanvas: HTMLCanvasElement) {
    super(videoElement, ghostCanvas);
  }
  getImageBitmap(): Promise<ImageBitmap> {
    this.element.crossOrigin = "anonymous";
    return createImageBitmap(this.element);
  }
}

export class Image extends Target<HTMLImageElement> {
  constructor(imgElement: HTMLImageElement, ghostCanvas: HTMLCanvasElement) {
    super(imgElement, ghostCanvas);
  }
  async getImageBitmap(): Promise<ImageBitmap> {
    this.element.crossOrigin = "anonymous";
    const frame = await new Promise<ImageBitmap>((resolve, reject) => {
      this.element.onload = async () => {
        const bitmap = await createImageBitmap(this.element);
        resolve(bitmap);
      };
      this.element.onerror = (e) =>
        reject(`Error retrieving image: ${String(e)}`);
    });
    return frame;
  }
}

export class Canvas extends Target<HTMLCanvasElement> {
  constructor(
    canvasElement: HTMLCanvasElement,
    ghostCanvas: HTMLCanvasElement
  ) {
    super(canvasElement, ghostCanvas);
  }
  async getImageBitmap(): Promise<ImageBitmap> {
    return createImageBitmap(this.element);
  }
}
