console.log("Init Background JS");

chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete' && tab.active) {

    console.log("Active tab loaded...");

  }
})