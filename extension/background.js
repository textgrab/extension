// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


function doInCurrentTab(tabCallback) {
  chrome.tabs.query(
      { currentWindow: true, active: true },
      function (tabArray) { tabCallback(tabArray[0]); }
  );
}

chrome.runtime.onMessage.addListener(function(message, sender) {
  console.log('Running inject');
  
  doInCurrentTab( function(tab) { 
    activeTabId = tab.id
    chrome.scripting.executeScript(
      {
        target: {tabId: activeTabId},
        files: ["./inject.js"],
      });
      console.log('Done running');
  })
    
  });



// chrome.browserAction.onClicked.addListener(function (tab) {
//   chrome.extension.getBackgroundPage().console.log('Running background js');
//   // for the current tab, inject the "inject.js" file & execute it
//   chrome.tabs.executeScript(tab.ib, {
//     file: "inject.js",
//   });
// });


//example of using a message handler from the inject scripts
// chrome.extension.onMessage.addListener(
//   function(request, sender, sendResponse) {
//   	chrome.pageAction.show(sender.tab.id);
//     sendResponse();
//   });

