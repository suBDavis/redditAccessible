const CHANGE_REDDIT_URL = "https://reddit.com/subreddits/mine";
const TUTORIAL_URL = "https://subdavis.com/redditAccessible/#tutorial";

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

function setColor(bttn){
  var clr = $(bttn.currentTarget).css('background-color');
  clr = rgb2hex(clr);
  console.log(clr);
  var query = "setColor";
  send({query:query, color:clr}, function(){
    // What do when return?
  });
}

function openMySubreddits(){
  chrome.tabs.create({url: CHANGE_REDDIT_URL});
}
function openTutorial(){
  chrome.tabs.create({url:TUTORIAL_URL});
}

var hexDigits = new Array("0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"); 
//Function to convert rgb color to hex format
function rgb2hex(rgb) {
 rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
 return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}
function hex(x) {
  return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
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
      $("#toggleSpeech").text("Disable Speech");
  });
  $("#toggle").on('click', toggle);
  $("#toggleSpeech").on('click', toggleVoiceOver);
  $("#changeSubreddit").on('click', openMySubreddits);
  $("#tutorial").on('click', openTutorial);
  $(".colorbutton").on('click', setColor);
};

// TODO: implement font size slider...