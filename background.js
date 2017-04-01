var enabled = true;

console.log("Init Background JS");

// When the content script asks, tell them if we are enabled...
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.query == "checkEnabled"){
      console.log("Query done.");
      sendResponse({enabled: enabled});  // don't allow this web page access
    } else {
      console.log("Uknown query");
      sendResponse({enabled: false});
    }
  });

// Allow the popup script to update my state.
chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
  enabled = message.enabled;
  sendResponse({enabled: enabled});
});