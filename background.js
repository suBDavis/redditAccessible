window.app_enabled = true;
window.speech_enabled = false;

console.log("Init Background JS");
update_from_local();

// When the content script asks, tell them if we are enabled...
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.query == "checkAll"){
      sendResponse({
        app_enabled: window.app_enabled,
        speech_enabled: window.speech_enabled
      });
    }
    else if (request.query == "checkEnabled"){
      if (window.app_enabled)
        chrome.tabs.insertCSS(sender.tab.id, {file:"content.css", runAt: "document_end"}, function(){});
      sendResponse({app_enabled: window.app_enabled});  // don't allow this web page access
      console.log("Query done.  checkEnabled");
    
    } else if (request.query == "checkSpeech") {
      sendResponse({speech_enabled: window.speech_enabled});
      console.log("Query done.  checkSpeech");

    } else if (request.query == "toggleApp") {
      window.app_enabled = request.enabled;
      update_local({accessibleReddit_enabled: request.enabled});
      sendResponse({app_enabled: window.app_enabled});
      reload_tab();
      console.log("Query done.  toggleApp");
    
    } else if (request.query == "toggleSpeech") {
      window.speech_enabled = request.enabled;
      update_local({accessibleReddit_speechEnabled: request.enabled});
      sendResponse({speech_enabled: window.speech_enabled});
      console.log("Query done. toggleSpeech");
    
    } else {
      console.log("Uknown query");
      sendResponse({error: "unknown query"});
      console.log(request);
    }
  });

function reload_tab(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {query: "reload"}, function(response){
      if (response)
        console.log("Content script got the message: " + response.status);
    });
  });
}

// Update local storage when config changes.
function update_local(dict){
  chrome.storage.local.set(dict, ()=>{
    console.log("local storage updated");
  });
}

// Used to persist settings through chrome sessions.
function update_from_local(argument) {
  chrome.storage.local.get(["accessibleReddit_enabled", "accessibleReddit_speechEnabled"], function(items){
      console.log("Updating from local storage...");
      console.log(items);
      if (items.accessibleReddit_enabled != null)
        window.app_enabled = items.accessibleReddit_enabled;
      if (items.accessibleReddit_speechEnabled != null)
        window.speech_enabled = items.accessibleReddit_speechEnabled;
  });
}