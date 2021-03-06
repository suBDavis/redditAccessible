const BASEURL = "https://www.reddit.com/";
const REDDIT_IMAGE_DOMAINS = ["i.redd.it", 'i.reddituploads.com', 'i.redditmedia.com']; // the data domains that we can load as images.
const IMAGE_EXTENSIONS = ["jpg","png","gif","jpeg"];
const VIDEO_EXTENSIONS = ["gifv", "webm", "mp4"];
const IFRAME_DOMAINS = ['flic.kr', 'flickr.com', 'xkcd.com']; // for these urls, the page is good for IFRAME.
const YOUTUBE_DOMAINS = ['youtube.com', 'youtu.be', 'm.youtube.com'];
const TWITTER_DOMAINS = ['twitter.com', 'mobile.twitter.com'];
const GFYCAT_DOMAINS = ['gfycat.com'];
const IMGUR_DOMAINS = ['imgur.com'];  // IMGUR without extension...
const CHANGE_REDDIT_URL = "https://reddit.com/subreddits/mine";
const GENERAL_SUBREDDIT_URL = "https://reddit.com/subreddits";
const UNFLUFF_SERVER = "https://unfluff.subdavis.com/unfluff";
const TWITTER_FETCHER = "https://unfluff.subdavis.com/twitter";
const NEXT_SWITCH_KEYS = [39, 40, 9]; // RIGHT, DOWN, TAB
const SELECT_SWITCH_KEYS = [13, 37];  // ENTER, LEFT
const BACK_KEYS = [38];               // UP

// The only global variable!!!
// NO MORE GLOBAL VARIABLES!!!
window.cursor = null;

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

  this.focus = (container, reload, post_success, comment_success) => {
    scrollTo(this.elem, container);
    $(this.elem).addClass("acc_focused");
    var title = $(this.elem).find(".title a").first().text();
    acc_speak(title);
    if (reload){
      this.show_details(post_success, comment_success);
    }
  }
  this.unfocus = () => {
    $(this.elem).removeClass("acc_focused");
    window.speechSynthesis.cancel();
  }
  this.select = () => {
    // POST ITEM has no select functionality.
  }
  this.show_details = (post_success,comment_success) => {
    var post = this.elem;
    var subreddit = get_subreddit();
    // Get post identifier...
    var post_id = $(post).attr("data-fullname");
    var data_domain = $(post).attr("data-domain");
    post_id = post_id.substring(3);

    // load the comments 
    var comment_url = "/r/" + subreddit + "/comments/" + post_id + ".json";
    if (subreddit == "front_page") {
      comment_url = "/" + post_id + ".json";
    }
    console.log(subreddit);
    $.getJSON(comment_url, (data) => {
      // Data received...  display comments.
      var title = data[0].data.children[0].data.title;
      console.debug("Comment JSON loaded... " + title);
      
      // REDDIT TEXT TYPE 
      if (data_domain == "self."+subreddit){
        // IF TEXT POST, comment data will contain the text post as well...
        var html_post = data[0].data.children[0].data.selftext_html;
        var decoded = decodeEntities(html_post);
        $("#acc_content").html((decoded) ? decoded : "[EMPTY - no content body]");
        post_success();
      // REDDIT IMAGE TYPE
      } else if ( $.inArray(data_domain, REDDIT_IMAGE_DOMAINS) >= 0 ){
        var content_url = data[0].data.children[0].data.url;
        if (data_domain == 'i.reddituploads.com')
          content_url = content_url.replace('&amp;', '&');
        var html_post = "<img src='"+content_url+"'><\/img>";
        $("#acc_content").html(html_post);
        post_success();
      // SOMETHING ELSE
      } else {
        var content_url = data[0].data.children[0].data.url;
        this.handle_external_content(data_domain, content_url, post_success);
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
      comment_success();
    });
  }
  this.handle_external_content = (content_domain, content_url, post_success) => {
    // Returns HTML which should be dumped into the content window.
    var extension = content_url.substr(content_url.lastIndexOf('.')+1);
    if (extension.indexOf(':')>=0)
      extension = extension.substr(0, extension.indexOf(":"));
    if (extension.indexOf('?')>-0)
      extension = extension.substr(0, extension.indexOf('?'));
    var spinner = new Spinner({top: '20%', scale: 2.5}).spin();

    // YOUTUBE
    if ( $.inArray(content_domain, YOUTUBE_DOMAINS) >= 0 ){
      var video_id = getParameterByName('v', content_url);
      if (content_domain == "youtu.be")
        video_id = url_to_a(content_url).pathname;
      var embed = "<iframe id='ytplayer' type='text\/html' width='100%' height='100%' \
        src='https:\/\/www.youtube.com/embed/"+video_id+"?autoplay=1&origin=http:\/\/www.reddit.com' \
        frameborder='0'><\/iframe>";
      $("#acc_content").html(embed);
      post_success();
    // GENERAL IMAGE
    } else if ($.inArray( extension, IMAGE_EXTENSIONS ) >= 0) {  
      $("#acc_content").html("<img src='"+content_url+"'><\/img>");
      post_success();
    // GENERAL VIDEO FORMAT
    } else if ($.inArray( extension, VIDEO_EXTENSIONS ) >= 0) {
      if (extension == 'gifv'){
        extension = 'mp4';
        content_url = content_url.substr(0, content_url.lastIndexOf('.')+1) + extension;
        content_url = "http://" + content_url.substr(content_url.indexOf(':')+1); // rewrite to http
      }
      console.debug("Video: " + content_url);
      var embed = '<video preload="auto" autoplay="autoplay" loop="loop" style="width: 100%; height: 100%;"> \
          <source src="'+content_url+'" type="video/'+extension+'"></source> \
        </video>';
      $("#acc_content").html(embed);
      post_success();
    // IMGUR DOMAIN NO EXTENSION
    } else if ($.inArray(content_domain, IMGUR_DOMAINS) >= 0 ) {
      var post_id = url_to_a(content_url).pathname;
      $("#acc_content").html("<img src='http://i.imgur.com/"+post_id+".gif'><\/img>"); // gif will always display.
      // TODO: Embed album types...
      post_success();
    // EMBEDDED TWEET
    } else if ($.inArray(content_domain, TWITTER_DOMAINS) >= 0 ) {
      // Load the tweet from the oEmbed endpoint
      $.ajax({
        type: "GET",
        url: TWITTER_FETCHER + "?url=" + content_url,
        success: function(data){
          $("#acc_content").html("<h1>Twitter: <\/h1>" + data.html);
          post_success();
        }
      });
      $("#acc_content").html(spinner.el);
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
      post_success();
    // HAIL MARY - TRY UNFLUFF
    } else {
      $.ajax({
        type:"GET",
        url: UNFLUFF_SERVER + "?url=" + content_url,
        success: (data)=> {
          if (!(window.cursor.current_context.current == this))// if the cursor has moved...
            return false; // TODO - why doesnt this work.
          if (data.error)
            $("#acc_content").html("<p>[Could not load]<\/p>" + content_url);
          else {
            var article = "<a href='"+data.canonicalLink+"'><h1>"+data.title+"<\/h1><\/a>";
            if (data.image != null)
              article += "<img class='acc_article' src="+data.image+"><\/img>";
            // break article up by periods...
            var sentences = data.text.replace(/([a-z][a-z][a-z][.?!])\s*(?=[A-Z])/g, "$1|").split("|");
            for (var i=0; i<sentences.length; i++)
              article += "<p>" + sentences[i] + "<\/p>";
            $("#acc_content").html(article);
          }
          post_success();
        },
        error: function(e){
          console.error(e);
          post_success();
        }
      });
      $("#acc_content").html(spinner.el);
    }
  }
};

var GenericItem = function(elem, select_callback){
  Item.call(this, elem);
  this.focus = (container, reload) => {
    scrollTo(this.elem, container);
    $(this.elem).addClass("acc_focused");
    acc_speak($(this.elem).text());
  }
  this.unfocus = () => {
    window.speechSynthesis.cancel();
    $(this.elem).removeClass("acc_focused");
  }
  this.select = () => {
    select_callback(this.elem);
  }
}

var Context = function(parent, items, container){
  /*
    This is a context, which is an element where
    a set of iterable items are contained..

    a context knows:
    - the parent context (if it exists)
    - the set of items in it's own context.

    a context implements:
    - next()
    - previous()
  */
  this.container = container;
  this.parent = parent;
  this.items = items;
  this.index = 0;
  if (items.length > 0){
    this.current = items[0];
  }

  this.next = () => {
    if (this.index + 1 < this.items.length ){
      var itm = this.items[this.index+1];
      this.goto(itm, true);
      
    } else if ( this.items.length > 0 ) {
      // TODO: wrap around.
      // also logic for adding the buttons at the bottom.
      this.goto(this.items[0]);
    }
  }
  // Decrement the cursor
  this.previous = () => {
    if (this.index - 1 >= 0 ){
      var itm = this.items[this.index-1];
      this.goto(itm, true);

    } else if ( this.items.length > 0 ) {
      this.goto(this.items[this.items.length - 1]);
    }
  }
  this.select = () => {
    // because JS has no method override...
    if (typeof this.unique_handle_select === "function")
      this.unique_handle_select();
    this.current.select();
  }
  this.ascend = () => {
    // Swap back to parent context.
    window.cursor.switch_context(this.parent);
    this.current.unfocus();
    this.parent.goto(this.parent.current, false);
  }
  this.goto = (item, reload) => {
    // Verify that the cursor is up to date with the context.
    window.cursor.current_context.current.unfocus(); // Universally unfocus
    window.cursor.switch_context(this);
    this.current = item;
    if (typeof this.unique_handle_focus === "function")
      this.unique_handle_focus(item, this.container, reload);
    else
      this.current.focus(this.container, reload);
    this.index = $.inArray(item, this.items);
  }
  this.getItemByElem = (elem) => {
    for (var i=0; i<this.items.length; i++)
      if ($(elem).attr('id') == $(this.items[i].elem).attr('id'))
        return this.items[i];
    return null;
  }
  this.addItem = (item) => {
    this.items.push(item);
  }

  // SETUP CLICK HANDLERS FOR GENERAL OBJECTS
  // Expose this function such that if subclasses add more items, they can call it again to setup click handlers.
  this.setup_click_handers = () => {
    console.debug("Setup click handlers");
    for (var i =0; i < this.items.length; i++){ 
      $(this.items[i].elem).off('click');
      $(this.items[i].elem).click((eventObject) => {
        // get the item.
        console.log(eventObject);
        var elem = eventObject.currentTarget;
        var itm = this.getItemByElem(elem);
        this.goto(itm, true);
      });
    }
  }
  this.setup_click_handers(); 
}

var PostContext = function(parent, items, container){

  // <nonsense>
  // This nonsense is here because
  // we need to build the entire context tree every time the 
  // post changes, and to do that we have to wait until all the AJAX
  // callback hell is done.
  this.post_done = false;
  this.comment_done = false;

  this.post_success = () => {
    if (this.comment_done)
      this.menu_subcontext = new PostMenuContext(this, [], $("#acc_content_menu").first());
    this.post_done = true;
  }

  this.comment_success = () => {
    if (this.post_done)
      this.menu_subcontext = new PostMenuContext(this, [], $("#acc_content_menu").first());
    this.comment_done = true;
  }
  // </nonsense>

  this.unique_handle_select = () => {
    this.current.unfocus();
    if ( $(this.current.elem).hasClass('link') ){
      window.cursor.switch_context(this.menu_subcontext);
      this.menu_subcontext.goto(this.menu_subcontext.items[0], true);
    }
  }

  this.unique_handle_focus = (item_to_focus, container, reload) => {
    item_to_focus.focus(container, reload, this.post_success, this.comment_success)
  }

  // Do a few more things before calling the constructor.
  Context.call(this, parent, items, container);

  // SET UP OTHER BUTTON HANDLERS
  (() => { 
    $(".next-button a").text("Next Page");
    $(".prev-button a").text("Previous Page");
    
    var nextbtn = new GenericItem($(".next-button a").get(0), (event)=>{
      console.debug("selected next");
      window.location.href = $(".next-button a").first().attr('href');
    });
    var prevbtn = new GenericItem($(".prev-button a").get(0), (event)=>{
      console.debug("selected prev");
      window.location.href = $(".prev-button a").first().attr('href');
    });

    if (prevbtn.elem)
      this.addItem(prevbtn);
    if (nextbtn.elem)
      this.addItem(nextbtn);
  })();

  //Pre-populates the page with the new DOM elements that this application needs.
  ((subreddit) => {
    var acc_wrapper = "<div id='acc_wrapper'></div>";
    $(this.container).after(acc_wrapper);

    var content_section = "<div id='acc_content' class='acc'>This is /r/"+subreddit+" - Content is loading</div>";
    $("#acc_wrapper").append(content_section);
    
    var comment_section = "<div id='acc_comments' class='acc'><h1>Comments</h1>comments are loading...</div>";
    $("#acc_wrapper").append(comment_section);

    var menu_section = "<div id='acc_content_menu' class='acc'> \
        <button class='acc_menu_button' id='menuReadComments'>🗨 Comments</button> \
        <button class='acc_menu_button' id='menuReadContent'>📕 View Post</button> \
        <button class='acc_menu_button' id='menuGoBack'>⬅ Go Back</button> \
        <button class='acc_menu_button' id='menuChangeSubreddit'>🌐 Change Subreddit</button> \
      </div>";
    $("#acc_wrapper").append(menu_section);
  })(get_subreddit());

  this.setup_click_handers(); // Do this again, since there are new items that need click handlers...
}

var PostMenuContext = function(parent, items, container){
  // Do a few more things before calling the constructor.
  this.comment_ctx = null;
  this.post_body_ctx = null;

  // Unimplemented, because each button has a different behavior...
  this.unique_handle_select = () => {}

  // Create the comment contexts...
  this._create_comment_context = ()=>{
    var comments = $(".acc_comment");
    var comment_items = [];
    for (var i = 0; i < comments.length; i++){
      $(comments[i]).attr('id', "acc_comment_"+i);
      comment_items.push(new GenericItem(comments[i], (event)=>{} ));
    }
    this.comment_ctx = new CommentContext(this, comment_items, $("#acc_comments"));
  };
  this._create_comment_context();

  this._select_comment_context = () => {
    if (this.comment_ctx.items.length == 0){
      acc_speak("There are no comments");
      return;
    }
    this.current.unfocus();
    this.comment_ctx.goto(this.comment_ctx.current,true);
    maximize_comments();
  }
  
  // Create the post body context...
  this.post_body_ctx = new PostBodyContext(this, [], $("#acc_content"));

  this._select_post_body_context = () => {
    // window.cursor.switch_context(this.post_body_ctx);
    // change the focus
    this.current.unfocus();
    this.post_body_ctx.goto(this.post_body_ctx.current, true);
    maximize_content();
  }

  var items = [
    new GenericItem($("#menuReadComments"), (event)=>{
      this._select_comment_context();
    }),
    new GenericItem($("#menuReadContent"), (event)=>{
      this._select_post_body_context();
    }),
    new GenericItem($("#menuGoBack"), (event)=>{
      this.ascend();
    }),
    new GenericItem($("#menuChangeSubreddit"), (event)=>{
      window.location.href = CHANGE_REDDIT_URL;
    })
  ];
  Context.call(this, parent, items, container);
}

var CommentContext = function(parent, items, container){
  
  this.unique_handle_select = () => {
    console.debug("SELECTED COMMENT");
    this.current.unfocus();
    window.cursor.switch_context(this.parent);
    this.parent.goto(this.parent.current, true);
  }

  this.unique_handle_focus = (item_to_focus, container, reload) => {
    item_to_focus.focus(container, reload);
    maximize_comments();
  }

  Context.call(this, parent, items, container);
}

var SubredditContext = function(parent, items, container){
  Context.call(this, parent, items, container);
  // SET UP OTHER BUTTON HANDLERS
  (() => { 
    $(".next-button a").text("Next Page");
    $(".prev-button a").text("Previous Page");
    
    var nextbtn = new GenericItem($(".next-button a").get(0), (event)=>{
      console.debug("selected next");
      window.location.href = $(".next-button a").first().attr('href');
    });
    var prevbtn = new GenericItem($(".prev-button a").get(0), (event)=>{
      console.debug("selected prev");
      window.location.href = $(".prev-button a").first().attr('href');
    });

    if (prevbtn.elem)
      this.addItem(prevbtn);
    if (nextbtn.elem)
      this.addItem(nextbtn);
  })();
}

var PostBodyContext = function(parent, items, container){
  /* 
    By the time this is called, the post body has been loaded and
    We can look at it to see how it should behave
  */
  this.unique_handle_select = () => {
    console.debug("SELECTED POST");
    this.current.unfocus();
    window.cursor.switch_context(this.parent);
    this.parent.goto(this.parent.current, true);
  }
  this.unique_handle_focus = (item_to_focus, container, reload) => {
    item_to_focus.focus(container, reload);
    maximize_content();
  }
  this.find_items = (container) => {
    // returns the item list in the post body, or none.
    var paragraphs = $(container).find('p');
    console.log(paragraphs);
    if (paragraphs.length > 0){
      var paragraph_items = [];
      for (var i = 0; i<paragraphs.length; i++){
        $(paragraphs[i]).attr('id', "acc_paragraph_"+i);
        paragraph_items.push(new GenericItem(paragraphs[i], (event)=>{
          this.unique_handle_select();
        }));
      }
      // if there are iterable paragraphs,
      return paragraph_items;
    } else {
      // This is not an iterable.
      return [new GenericItem(container, (event)=>{})];
    }
  }
  // we need to remove the clickability of the parent container
  $(container).off('click');
  // Invoke the superconstructor.
  Context.call(this, parent, this.find_items(container), container);
}

var Cursor = function(context){
  /*
    This is the cursor, and it handles state changes in the UI.  
    No user-interaction UI changes should happen without going through the cursor.
    This exists to avoid globals and allow a single object to be passed around for UI changes.
  */

  this.switch_context = (new_context) => {
    /*
      When switching context, check if we need to reset the view.
    */

    if (this.current_context instanceof CommentContext 
      && (new_context != this.current_context)){
      console.log("Switching context...");
      // Moving into Comment Section
      minimize_comments();
    } else if (this.current_context instanceof PostBodyContext 
      && (new_context != this.current_context)){
      // Moving into Post Body
      minimize_content();
    } else {
      // Do nothing....
    }
    /* 
      Now set up the rest of the internal state..
    */
    this.current_context = new_context;
    this.next = this.current_context.next;
    this.previous = this.current_context.previous;
    this.select = this.current_context.select;
  }

  // Switch to the constructor context.
  this.switch_context(context);

  // SETUP KEY HANDLERS - GLOBALLY NEEDED
  (() => {
    console.debug("Setup key handlers");
    $(window).keydown((eventData) => {
      if ( $.inArray(eventData.which, NEXT_SWITCH_KEYS) >= 0){
        // next
        eventData.preventDefault();
        this.next();
      } else if ($.inArray(eventData.which, SELECT_SWITCH_KEYS) >= 0) {
        // select
        eventData.preventDefault();
        this.select();
      } else if ($.inArray(eventData.which, BACK_KEYS) >= 0) {
        // back...
        eventData.preventDefault();
        this.previous();
      }
    });
  })();

}

/*
  INIT - When extension is enabled.
*/

function init(){
  console.debug("Initializing accessibleReddit...");
  // Setup inheritance
  function inheritsFrom(child, parent) {
    child.prototype = Object.create(parent.prototype);
  };
  inheritsFrom(PostItem, Item);
  inheritsFrom(GenericItem, Item);
  inheritsFrom(PostContext, Context);
  inheritsFrom(PostBodyContext, Context);
  inheritsFrom(PostMenuContext, Context);
  inheritsFrom(CommentContext, Context);
  inheritsFrom(SubredditContext, Context);
}

function subreddit_init(){
  init();
  // Remove things we dont' want.
  remove_elements();
  // Parse posts.
  var posts = $(".thing");
  
  // If no post items were discovered, we can assume the user was not logged in.  Redirect to /subreddits
  if (posts.length <= 0)
    window.location.href = GENERAL_SUBREDDIT_URL;
  
  // Otherwise, populate the page...
  var post_items = []; 
  for (var i = 0; i < posts.length; i++)
    post_items.push(new PostItem(posts[i]));
  
  // Add the ABOUT section as a post on the first page.
  var about = $(".usertext-body");
  
  // Setup nagivation handlers.
  var ctx = new PostContext(null, post_items, $("#siteTable"));
  window.cursor = new Cursor(ctx);
  ctx.goto(ctx.current, true);
}

function choose_init(){
  init();
  remove_elements();
  remove_choose_elements();
  var subreddits = $(".thing");
  var subreddit_items = []; 
  for (var i = 0; i < subreddits.length; i++)
    subreddit_items.push(new GenericItem(subreddits[i], (elem)=>{
      // on click, goto subreddit selected.
      var target = $(elem).find(".entry .titlerow a").first().attr('href');
      window.location.href = target;
    }));
  // Setup nagivation handlers.
  var ctx = new SubredditContext(null, subreddit_items, $("#siteTable"));
  window.cursor = new Cursor(ctx);
  ctx.goto(ctx.current, true);
}

/* 
  GENERAL HELPER FUNCTIONS
*/

function acc_speak(text){
  // Ask the background whether or not speech is enabled.
  chrome.runtime.sendMessage({query: "checkSpeech"}, function(response) {
    if (response.speech_enabled){
      var msg = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(msg);
    }
  });
}

function get_subreddit(){
  var url = window.location.pathname;
  var after_r = url.split('/r/')[1];
  if (typeof after_r !== 'undefined'){
    var before_slash = after_r.split('/');
    return before_slash[0];  
  }
  return "front_page";
}

function remove_elements(){
  // REMOVE ALL THE OTHER TRASH IN DOM
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
  $("#siteTable::before").css('display', 'none');

  var children = $(".nextprev").children();
  $(".nextprev").html(children); // text around next button
  $(".link .entry .title a").click(function(e){
    // Disable all links. We aren't going to use them.
    e.preventDefault();
  });
}

function remove_choose_elements(){
  // A couple things on /subreddits/mine
  $(".menuarea").remove();
  $(".infobar").remove();
  $(".midcol").remove();
  $(".searchpane").remove();
  $(".sr-interest-bar").remove();
}

function scrollTo(elem, parent_container) {
  // takes 2 items, scrolls the parent to elem
  var parent_top = $(parent_container).offset().top; // absolute position of parent.
  var elem_top = $(elem).offset().top - parent_top - 60;  // position of element with respect to top of parent.
  var current_pos = $(parent_container).scrollTop(); // where the scrollbar is.
  $(parent_container).stop().animate({
      scrollTop: elem_top + current_pos
    },500);
}

function decodeEntities(encodedString) {
    // takes an ascii-escaped string and converts it back to raw html.
    var textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
}

function getParameterByName(name, url) {
    /*
      For example, given
        url  = "https://example.com?key=value"
        name = "key"
      This method returns "value"
    */
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
  // Turns a URL into an <anchor> element
  var l = document.createElement("a");
  l.href = url;
  return l;
}

/* 
  ANIMATIONS
*/

function maximize_comments(){
  // ANIMATE EXPAND.
  $("#acc_content").slideUp({duration: 200, queue: false});
  $("#acc_comments").animate({
    height: "88vh"
  },{duration: 200, queue: false});
}
function minimize_comments(){
  // ANIMATE RETURN TO NORMAL.
  $("#acc_content").slideDown({duration: 200, queue: false});
  $("#acc_comments").animate({
    height: "40vh"
  },{duration: 200, queue: false});
}
function maximize_content(){
  $("#acc_comments").slideUp({duration: 200, queue: false});
  $("#acc_content").animate({
    height: "87vh"
  },{duration: 200, queue: false});
}
function minimize_content(){
  // ANIMATE RETURN TO NORMAL.
  $("#acc_comments").slideDown({duration: 200, queue: false});
  $("#acc_content").animate({
    height: "44vh"
  },{duration: 200, queue: false});
}
function reset_content_windows(){
  minimize_comments();
  minimize_content();
}

/*
  MAIN - Runs on code INJECT.
*/

(()=>{
  console.debug("Checking before startup...");

  // Listen for messages from chrome runtime.
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.debug(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");
      if (request.query == "reload"){
        window.location.reload();
        sendResponse({status: "thanks"});
      } else if (request.query == "setColor"){
        $("body.listing-page").css('background-color', request.color);
      } else {
        sendResponse({status: "unknown"});
      }
  });

  // Check what sort of page we are on.
  var init_func;
  var page;
  var path = window.location.pathname;
  if (path.indexOf("/subreddits") >= 0){
    init_func = choose_init;
    page = "choose";
  } else {
    init_func = subreddit_init;
    page = "subreddit";
  }
  // Ask the background if the app is enabled...
  chrome.runtime.sendMessage({query: "checkAll", page: page}, function(response) {
    if (response.app_enabled){
      console.debug("Extension Enabled.");
      if (response.color){
        window.acc_bgcolor = response.color;
        $("body.listing-page").css('background-color', response.color);
      }
      init_func();
    } else {
      console.debug(response);
      console.debug("Extension Disabled.");
    }
  });
})();
