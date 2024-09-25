# TextGrab Chrome Extension

TextGrab is a Chrome Extension that leverages machine learning (OCR) to allow text to be copyable from any online media!

### Running the Chrome Extension locally

1. `git clone git@github.com:textgrab/extension.git`
2. In Chrome, go to Settings > Extensions and enable **Developer mode** in the top right of the screen
<img width="1512" alt="Screen Shot 2022-02-27 at 10 53 30 PM" src="https://user-images.githubusercontent.com/37857112/155921265-460eb51d-79ca-4832-b5dc-7362a88c20a8.png">

3. Run `npm run build` in the cloned TextGrab `extension` directory to build the production `dist` folder, or run `npm run watch` so that every change you make updates the `dist` folder. The latter method will only produce development builds.


4. Click the `Load Unpacked` and select the directory of the `dist` folder

The TextGrab extension should now be installed in your Chrome browser and should be visible in the installed extensions:

<p align="center">
<img width="404" alt="Screen Shot 2022-02-27 at 10 55 16 PM" src="https://user-images.githubusercontent.com/37857112/155921444-a0041614-e1e1-4aca-a8b3-361eb0c9c6de.png">

</p>
