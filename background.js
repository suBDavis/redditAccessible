window.app_enabled = true;

console.log("Init Background JS");

// When the content script asks, tell them if we are enabled...
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.query == "checkEnabled"){
      console.log("Query done.");
      if (window.app_enabled)
        chrome.tabs.insertCSS(sender.tab.id, {file:"content.css", runAt: "document_end"}, function(){});
      sendResponse({enabled: window.app_enabled});  // don't allow this web page access
    } else if (request.query == "toggleEnable") {
      window.app_enabled = request.enabled;
      sendResponse({app_enabled: window.app_enabled});
    } else {
      console.log("Uknown query");
      sendResponse({error: "unknown query"});
    }
  });