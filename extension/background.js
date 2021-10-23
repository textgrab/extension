chrome.runtime.onMessage.addListener(function (message, sender) {
  console.log(message);
  if (!message.myPopupIsOpen) return;
  chrome.extension.getBackgroundPage().console.log("Running inject");

  chrome.tabs.executeScript(null, {
    file: "./inject.js",
  });
  // Do your stuff
});

chrome.commands.onCommand.addListener(function (command) {
  switch (command) {
    case "textgrab": {
      chrome.tabs.executeScript(null, {
        file: "./inject.js",
      });
      break;
    }
  }
});
