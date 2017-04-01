const BASEURL = "https://www.reddit.com/";
const IMAGE_DOMAINS = ["i.redd.it", 'i.imgur.com']; // the data domains that we can load as images.
const APP_ID = "jpahcocjpdmokcdkemanckhmkjbpcegb";

// Listen for messages from the pop up
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.action == "start"){
      //Start
    }
    if (request.action == "stop"){
      //Stop
    }
    location.reload();
    sendResponse({status: "thanks"});
});

function main(){
  console.log("Checking before startup...");
  // Ask the background if the app is enabled...
  chrome.runtime.sendMessage(APP_ID, {query: "checkEnabled"}, function(response) {
    if (response.enabled){
      console.log("Extension Enabled.");
      init();
    } else{
      console.log(response);
      console.log("Extension Disabled.");
    }
  });
}

function init(){
  console.log("Initializing accessibleReddit...");
  purge_unneeded();
  var posts = $(".link");
  var cursor = 0;
  var subreddit = get_subreddit();
  add_custom_sections(subreddit);
  show_details(subreddit, posts[0]);
}

function purge_unneeded(){
  // Purge unneeded elements from the DOM
  $("#header").remove(); 
  $(".side").remove();
  $(".footer-parent").remove();
  $(".thumbnail").remove(); //in post thumbnain
  $(".tagline").remove(); // in post
  $(".flat-list").remove(); //in post
  $(".promotedlink").remove(); // remove any promoted links
  $(".expando-button").remove(); // the +> expander button
  $(".rank").remove(); // number rank
  $(".domain").remove(); // in post
  $(".listing-chooser").remove(); // right gripper thing
  $(".organic-listing").remove(); // promoted links

  var children = $(".nextprev").children('span');
  $(".nextprev").html(children); // text around next button
}

function get_subreddit(){
  var url = window.location.pathname;
  var after_r = url.split('/r/')[1];
  var before_slash = after_r.split('/');
  console.log("You are reading "+ before_slash[0]);
  return before_slash[0];
}

function add_custom_sections(subreddit){
  var content_section = "<div id='acc_content'>This is /r/"+subreddit+" - Content is loading</div>";
  $("#siteTable").after(content_section);
}

function replace_next_button(){
  // Returns a reference to the next button
}

function show_details(subreddit, post){
  // Get post identifier...
  var post_id = $(post).attr("data-fullname");
  var data_domain = $(post).attr("data-domain");
  post_id = post_id.substring(3);
  console.log("Displaying " + post_id);

  // load the comments 
  var comment_url = "/r/" + subreddit + "/comments/" + post_id + ".json";
  $.getJSON(comment_url, function(data){
    // Data received...  display comments.
    console.log(data);
    
    // load content window with self.text
    if (data_domain == "self."+subreddit){
      // TEXT TYPE
      console.log("Displaying TEXT POST");
      // IF TEXT POST, comment data will contain the text post as well...
      var html_post = data[0].data.children[0].data.selftext_html;
      console.log("text_post");
      $("#acc_content").html(decodeEntities(html_post));
    }
  });

  // load the content window.
  if ( $.inArray(data_domain, IMAGE_DOMAINS) >= 0 ){
    // IMAGE TYPE
    console.log("Displaying IMAGE");
  } else if (data_domain == "self."+subreddit){
    // COMMENT ajax handles this...
    // DO NOTHING
  } else {  
    // UNKNOWN TYPE - try to parse it with unfluff
  }
}

function decodeEntities(encodedString) {
    var textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
}

// Begin...
main();