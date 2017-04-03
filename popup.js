function toggle(){
  var bttn = $("#toggle");
  var query = "toggleApp"
  if (bttn.text() == "Disable"){
    send({query: query, enabled: false}, function(){
      bttn.text("Enable");
    });
  } else {
    send({query: query, enabled: true}, function(){
      bttn.text("Disable");
    });
  }
}

function toggleVoiceOver(){
  var bttn = $("#toggleSpeech");
  var query = "toggleSpeech";
  if (bttn.text() == "Disable Speech"){
    send({query: query, enabled: false}, function(){
      bttn.text("Enable Speech");
    });
  } else {
    send({query: query, enabled: true}, function(){
      bttn.text("Disable Speech");
    });
  }
}

function send(message, callback){
  // First, update our internal state...
  chrome.runtime.sendMessage(message, function(response) {
    console.log("State changed...")
    console.log(response);
    callback(response);
  });
}

window.onload = function () {
  // Check with the background for the current state of buttons...
  send({query: "checkAll"}, function(response){
    if (!response.app_enabled)
      $("#toggle").text("Enable");
    if (response.speech_enabled)
      $("#toggleSpeech").text("Disable Speech")
  });
  $("#toggle").on('click', toggle);
  $("#toggleSpeech").on('click', toggleVoiceOver);
};