function toggle(){
  var bttn = $("#toggle");
  if (bttn.text() == "Disable"){
    send(false, function(){
      bttn.text("Enable");
    });
  } else {
    send(true, function(){
      bttn.text("Disable");
    });
  }
}

function send(message, callback){
  // First, update our internal state...
  chrome.runtime.sendMessage({enabled: message}, function(response) {
    console.log("Enabled state " + response.enabled);
    callback();
  });
  // Now, tell the active tab to reload...
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: message}, function(response){
      console.log("Content script got the message: " + response.status);
    });
  });
}

window.onload = function () {
  $("#toggle").on('click', toggle);
};