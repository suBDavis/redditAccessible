const BASEURL = "https://www.reddit.com/";
const REDDIT_IMAGE_DOMAINS = ["i.redd.it"]; // the data domains that we can load as images.
const IMAGE_EXTENSIONS = ["jpg","png","gif","jpeg"];
const VIDEO_EXTENSIONS = ["gifv", "webm", "mp4"];
const IFRAME_DOMAINS = []; // for these urls, the page is good for IFRAME.
const YOUTUBE_DOMAINS = ['youtube.com', 'youtu.be'];
const TWITTER_DOMAINS = ['twitter.com'];
const GFYCAT_DOMAINS = ['gfycat.com'];
const IMGUR_DOMAINS = ["imgur.com"]; // IMGUR without extension...
const APP_ID = "jpahcocjpdmokcdkemanckhmkjbpcegb";
const NEXT_SWITCH_KEYS = [39, 40]; // RIGHT, DOWN
const SELECT_SWITCH_KEYS = [13, 37]; // ENTER, LEFT
const BACK_KEYS = [38];

/*
  DEFINE OBJECTS
*/

var Item = function(elem){
  /*
    Abstract Class Item
    Implements the following

    focus()
    unfocus()
    select()
  */
  this.elem = elem;
};

var PostItem = function(elem){
  Item.call(this, elem);

  this.focus = () => {
    scrollTo(this.elem, $("#siteTable"));
    $(this.elem).addClass("acc_focused");
    var title = $(this.elem).find(".title a").first().text();
    acc_speak(title);
    show_details(get_subreddit(), this);
  }
  this.unfocus = () => {
    $(this.elem).removeClass("acc_focused");
    window.speechSynthesis.cancel();
  }
  this.select = () => {
    // What to do when we press enter....
  }
};

var ButtonItem = function(elem, button_select_function){
  Item.call(this, elem);

  this.focus = () => {
    scrollTo(this.elem, $("#siteTable"));
    $(this.elem).addClass("acc_focused");
    acc_speak($(this.elem).text());
  }
  this.unfocus = () => {
    $(this.elem).removeClass("acc_focused");
  }
  this.select = () => {
    button_select_function();
  }
}

var Cursor = function(items){
  /*
    This is the cursor, and it handles state changes in the UI.  
    No user-interaction UI changes should happen without going through the cursor.
    TODO: Might need a context in the future for when "cursor.next" means different things to the UI
  */
  this.items = items;
  this.index = 0;
  if (items.length > 0){
    this.current = items[0];
  }
  // Advance cursor to next element in the set.
  this.next = () => {
    if (this.index + 1 < this.items.length ){
      var itm = this.items[this.index+1]
      this.goto(itm);
      
    } else if ( this.items.length > 0 ) {
      // TODO: wrap around.
      // also logic for adding the buttons at the bottom.
      this.goto(this.items[0])
    }
  }
  // Decrement the cursor
  this.previous = () => {
    if (this.index - 1 >= 0 ){
      var itm = this.items[this.index-1]
      this.goto(itm);

    } else if ( this.items.length > 0 ) {
      this.goto(this.items[this.items.length - 1]);
    }
  }
  this.select = () => {
    this.current.select();
  }
  // Set cursor to specific element and display that element.
  this.goto = (item) => {
    this.current.unfocus();
    this.current = item;
    this.current.focus();
    this.index = $.inArray(item, this.items);
  }
  this.getItemByElem = (elem) => {
    for (var i=0; i<this.items.length; i++)
      if (elem == this.items[i].elem)
        return this.items[i];
    return null;
  }
  this.addItem = (item) => {
    this.items.push(item);
  }
}

/*
  MAIN APPLICATION LOGIC
*/

function main(){
  // Setup inheritance
  inheritsFrom(PostItem, Item);
  inheritsFrom(ButtonItem, Item);

  console.log("Checking before startup...");
  // Ask the background if the app is enabled...
  chrome.runtime.sendMessage({query: "checkEnabled"}, function(response) {
    if (response.app_enabled){
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
  
  // Modify page CSS
  purge_unneeded();
  add_custom_sections(subreddit);
  
  // Parse posts.
  var posts = $(".link");
  var post_items = [];
  for (var i = 0; i < posts.length; i++)
    post_items.push(new PostItem(posts[i]));

  // Setup nagivation handlers.
  var crsr = new Cursor(post_items);
  setup_click_handlers(posts, subreddit, crsr);
  setup_key_handlers(posts, subreddit, crsr);
  setup_onscreen_buttons(crsr);
  crsr.goto(crsr.current);
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
    // get the item.
    var elem = eventObject.currentTarget
    var itm = crsr.getItemByElem(elem);
    crsr.goto(itm);
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
      crsr.select();
    } else if ($.inArray(eventData.which, BACK_KEYS) >= 0) {
      // back...
      crsr.previous();
    }
  });
}

function setup_onscreen_buttons(crsr){
  $(".next-button a").text("Next Page");
  $(".prev-button a").text("Previous Page");
  
  var nextbtn = new ButtonItem($(".next-button a").first(), (event)=>{
    console.log("selected next");
    window.location.href = $(".next-button a").first().attr('href');
  });
  var prevbtn = new ButtonItem($(".prev-button a").first(), (event)=>{
    console.log("selected prev");
    window.location.href = $(".prev-button a").first().attr('href');
  });

  crsr.addItem(prevbtn);
  crsr.addItem(nextbtn);
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
      <button class='acc_menu_button' id='menuChangeSubreddit'>Choose another Subreddit</button> \
    </div>";
  $("#acc_wrapper").append(menu_section);

  // TODO: Setup button select handlers.
  
  var comment_section = "<div id='acc_comments' class='acc'><h1>Comments</h1>comments are loading...</div>";
  $("#acc_wrapper").append(comment_section);
}

function show_details(subreddit, item){
  var post = item.elem;
  // Get post identifier...
  var post_id = $(post).attr("data-fullname");
  var data_domain = $(post).attr("data-domain");
  post_id = post_id.substring(3);
  console.log("Displaying " + post_id);

  // load the comments 
  var comment_url = "/r/" + subreddit + "/comments/" + post_id + ".json";
  $.getJSON(comment_url, function(data){
    // Data received...  display comments.
    var title = data[0].data.children[0].data.title;
    console.log("Comment JSON loaded... " + title);
    
    // REDDIT TEXT TYPE
    if (data_domain == "self."+subreddit){
      console.log("Displaying TEXT POST");
      // IF TEXT POST, comment data will contain the text post as well...
      var html_post = data[0].data.children[0].data.selftext_html;
      var decoded = decodeEntities(html_post);
      $("#acc_content").html((decoded) ? decoded : "[EMPTY - no content body]");
    
    // REDDIT IMAGE TYPE
    } else if ( $.inArray(data_domain, REDDIT_IMAGE_DOMAINS) >= 0 ){
      console.log("Displaying IMAGE POST");
      var content_url = data[0].data.children[0].data.url;
      var html_post = "<img src='"+content_url+"'><\/img>";
      $("#acc_content").html(html_post);
    
    // SOMETHING ELSE
    } else {
      var content_url = data[0].data.children[0].data.url;
      handle_external_content(data_domain, content_url);
    }

    // load up to 10 top level comments
    var comment_count = 0;
    var length = Math.min(10, data[1].data.children.length);
    if (length == 0)
      $("#acc_comments").html("<h1>Comments</h1>There are no comments.");
    else
      $("#acc_comments").html("<h1>Comments</h1>");
    
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
  var extension = content_url.substr(content_url.lastIndexOf('.')+1);

  // YOUTUBE
  if ( $.inArray(content_domain, YOUTUBE_DOMAINS) >= 0 ){
    var video_id = getParameterByName('v', content_url);
    if (content_domain == "youtu.be")
      video_id = url_to_a(content_url).pathname;
    var embed = "<iframe id='ytplayer' type='text\/html' width='100%' height='100%' \
      src='https:\/\/www.youtube.com/embed/"+video_id+"?autoplay=1&origin=http:\/\/www.reddit.com' \
      frameborder='0'><\/iframe>";
    $("#acc_content").html(embed);
  
  // GENERAL IMAGE
  } else if ($.inArray( extension, IMAGE_EXTENSIONS ) >= 0) {  
    $("#acc_content").html("<img src='"+content_url+"'><\/img>");
  
  // GENERAL VIDEO FORMAT
  } else if ($.inArray( extension, VIDEO_EXTENSIONS ) >= 0) {
    if (extension == 'gifv'){
      extension = 'mp4';
      content_url = content_url.substr(0, content_url.lastIndexOf('.')+1) + extension;
      content_url = "http://" + content_url.substr(content_url.indexOf(':')+1); // rewrite to http
    }
    console.log("Video: " + content_url);
    var embed = '<video preload="auto" autoplay="autoplay" loop="loop" style="width: 100%; height: 100%;"> \
        <source src="'+content_url+'" type="video/'+extension+'"></source> \
      </video>';
    $("#acc_content").html(embed);
  
  // IMGUR DOMAIN NO EXTENSION
  } else if ($.inArray(content_domain, IMGUR_DOMAINS) >= 0 ) {
    var post_id = url_to_a(content_url).pathname;
    $("#acc_content").html("<img src='http://i.imgur.com/"+post_id+".gif'><\/img>"); // gif will always display.
    // TODO: Embed album types...

  // EMBEDDED TWEET
  } else if ($.inArray(content_domain, TWITTER_DOMAINS) >= 0 ) {
    var twitter_oEmbed_url = "https://api.twitter.com/1.1/statuses/oembed.json?id=";
    var href = url_to_a(content_url);
    var tweet_id = href.pathname.substring(href.pathname.lastIndexOf('status\/')+7); // 7 for length of "status/"
    if (tweet_id.indexOf("\/") >= 0)
      tweet_id = tweet_id.substring(0, tweet_id.indexOf("\/"));
    console.log("Fetching tweet " + tweet_id);

    // Load the tweet from the oEmbed endpoint
    $.ajax({
      type: "GET",
      url: twitter_oEmbed_url + tweet_id,
      jsonCallback: "jsonp",
      dataType: 'jsonp',
      success: function(data){
        $("#acc_content").html(data.html);
      }
    });

  // GFYCAT
  } else if ($.inArray(content_domain, GFYCAT_DOMAINS) >= 0) {
    var path = url_to_a(content_url).pathname;
    path = path.substring(1, path.length);
    $("#acc_content").html("<div style='position:relative;padding-bottom:calc(100% / 1.85)'> \
        <iframe src='https://gfycat.com/ifr/"+path+"' frameborder='0' scrolling='no' width='100%' height='100%' \
        style='position:absolute;top:0;left:0;' allowfullscreen></iframe></div>"); 

  // ACCEPTABLE IFRAME
  } else if ($.inArray(content_domain, IFRAME_DOMAINS) >= 0) {
    $("#acc_content").html("<iframe type='text/html' height='100%' width='100%' frameborder='0' scrolling='no' allowfullscreen src='"+content_url+"'><\/iframe>");
  
  } else {
    $("#acc_content").text("[Could not display content] " + content_url);
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
function acc_speak(text){
  var msg = new SpeechSynthesisUtterance(text);
  chrome.runtime.sendMessage({query: "checkSpeech"}, function(response) {
    if (response.speech_enabled){
      window.speechSynthesis.speak(msg);
    }
  });
  return msg;
}

function scrollTo(elem, parent_container) {
  // takes 2 items, scrolls the parent to elem
  var elem_top = $(elem).offset().top - 120;
  var current_pos = $(parent_container).scrollTop();
  $(parent_container).animate({
      scrollTop: elem_top + current_pos
    },500);
}

function inheritsFrom(child, parent) {
    child.prototype = Object.create(parent.prototype);
};

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

function url_to_a(url){
  var l = document.createElement("a");
  l.href = url;
  return l;
}

// Begin...

// Listen for messages from the pop up.
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.query == "reload"){
      location.reload();
      sendResponse({status: "thanks"});
    } else {
      sendResponse({status: "unknown"});
    }
});

main();