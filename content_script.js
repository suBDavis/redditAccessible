const BASEURL = "https://www.reddit.com/";
const IMAGE_DOMAINS = ["i.redd.it", 'i.imgur.com']; // the data domains that we can load as images.
const IFRAME_DOMAINS = ['gfycat.com']; // for these urls, the page is good for IFRAME.
const YOUTUBE_DOMAIN = ['youtube.com'];
const APP_ID = "jpahcocjpdmokcdkemanckhmkjbpcegb";
const NEXT_SWITCH_KEYS = [39, 40]; // RIGHT, DOWN
const SELECT_SWITCH_KEYS = [13, 37]; // ENTER, LEFT

var Cursor = function(subreddit, posts){
  /*
    This is the cursor, and it handles state changes in the UI.  
    No user-interaction UI changes should happen without going through the cursor.
    TODO: Might need a context in the future for when "cursor.next" means different things to the UI
  */
  this.posts = posts;
  this.index = 0;
  if (posts.length > 0){
    this.current = posts[0];
  }
  // Advance cursor to next element in the set.
  this.next = () => {
    if (this.index + 1 < this.posts.length ){
      var pst = this.posts[this.index+1]
      this.goto(pst);
      var post_top = $(pst).offset().top - 50;
      var current_pos = $("#siteTable").scrollTop();
      $("#siteTable").animate({
        scrollTop: post_top + current_pos
        },500);
    } else {
      // TODO: wrap around.
      // also logic for adding the buttons at the bottom.
    }
  }
  // Set cursor to specific element and display that element.
  this.goto = (post) => {
    $(this.current).removeClass("acc_focused");
    $(post).addClass("acc_focused");
    this.index = $.inArray(post, this.posts);
    this.current = post;
    show_details(subreddit, this.current);
  }
}

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
  var subreddit = get_subreddit();
  purge_unneeded();
  add_custom_sections(subreddit);
  var posts = $(".link");
  var crsr = new Cursor(subreddit, posts);
  setup_click_handlers(posts, subreddit, crsr);
  setup_key_handlers(posts, subreddit, crsr);
  crsr.goto(posts[0]);
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
  $(".nextprev .separator").remove(); // stupid separator between 'prev' and 'next'

  var children = $(".nextprev").children('span');
  $(".nextprev").html(children); // text around next button
  $(".link .entry .title a").click(function(e){
    // Disable all links. We aren't going to use them.
    e.preventDefault();
  })
}

function setup_click_handlers(posts, subreddit, crsr){
  console.log("Setup focus handlers");
  $(posts).click(function(eventObject){
    // add the hover class
    crsr.goto(eventObject.currentTarget);
  });
}

function setup_key_handlers(posts, subreddit, crsr){
  console.log("Setup key handlers");
  $(window).keydown(function(eventData){
    if ( $.inArray(eventData.which, NEXT_SWITCH_KEYS) >= 0){
      // next
      crsr.next();
    } else if ($.inArray(eventData.which, SELECT_SWITCH_KEYS) >= 0) {
      // select
      // TODO: implement the next context;
    }
  });
}

function add_custom_sections(subreddit){
  /*
    Pre-populates the page with the new DOM elements that this application needs.
  */
  var acc_wrapper = "<div id='acc_wrapper'></div>";
  $("#siteTable").after(acc_wrapper);

  var content_section = "<div id='acc_content' class='acc'>This is /r/"+subreddit+" - Content is loading</div>";
  $("#acc_wrapper").append(content_section);
  
  var menu_section = "<div id='acc_content_menu' class='acc'> \
      <button class='acc_menu_button' id='menuReadContent'>Read Post</button> \
      <button class='acc_menu_button' id='menuReadComments'>Read Comments</button> \
      <button class='acc_menu_button' id='menuGoBack'>Back to Posts</button> \
    </div>";
  $("#acc_wrapper").append(menu_section);

  // TODO: Setup button focus handlers...
  
  var comment_section = "<div id='acc_comments' class='acc'>comments are loading...</div>";
  $("#acc_wrapper").append(comment_section);
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
    console.log("Comment JSON AJAX loaded...");
    
    // load content window with self.text
    if (data_domain == "self."+subreddit){
      // TEXT TYPE
      console.log("Displaying TEXT POST");
      // IF TEXT POST, comment data will contain the text post as well...
      var html_post = data[0].data.children[0].data.selftext_html;
      $("#acc_content").html(decodeEntities(html_post));
    
    } else if ( $.inArray(data_domain, IMAGE_DOMAINS) >= 0 ){
      // IMAGE TYPE
      console.log("Displaying IMAGE POST");
      var content_url = data[0].data.children[0].data.url;
      var html_post = "<img src='"+content_url+"'><\/img>";
      $("#acc_content").html(html_post);
    
    } else {
      var content_url = data[0].data.children[0].data.url;
      $("#acc_content").html(handle_external_content(data_domain, content_url));
    }

    // load up to 10 top level comments
    var comment_count = 0;
    var length = Math.min(10, data[1].data.children.length);
    if (length == 0)
      $("#acc_comments").text("There are no comments.");
    else
      $("#acc_comments").html("<h2>Comments</h2>");
    
    while (comment_count < length){
      var html_comment = data[1].data.children[comment_count++].data.body_html;
      html_comment = $(decodeEntities(html_comment)).addClass('acc_hoverable acc_comment')
      $("#acc_comments").append(html_comment);
    }
  });
}

/*
  APP HELPERS
*/

function handle_external_content(content_domain, content_url){
  // Returns HTML which should be dumped into the content window.

  // YOUTUBE
  if ( $.inArray(content_domain, YOUTUBE_DOMAIN) >= 0 ){
    
    var video_id = getParameterByName('v', content_url);
    var embed = "<iframe id='ytplayer' type='text/html' width='100%' height='100%' \
      src='https://www.youtube.com/embed/"+video_id+"?autoplay=1&origin=http://www.reddit.com' \
      frameborder='0'></iframe>"
    return embed;
  
  } else {  
    // UNKNOWN TYPE - try to parse it with unfluff
  }
}

function get_subreddit(){
  var url = window.location.pathname;
  var after_r = url.split('/r/')[1];
  var before_slash = after_r.split('/');
  console.log("You are reading "+ before_slash[0]);
  return before_slash[0];
}

/* 
  GENERAL HELPER FUNCTIONS
*/

function decodeEntities(encodedString) {
    // takes an ascii-escaped string and converts it back to raw html.
    var textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
}

function getParameterByName(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}


// Begin...

// Listen for messages from the pop up.
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

main();