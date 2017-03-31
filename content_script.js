main();

function main(){
  console.log("Initializing accessibleReddit");
  purge_unneeded();
  var posts = $(".link");
  add_custom_sections();
  var cursor = 0;
  show_details(posts[0]);
}

function purge_unneeded(){
  jQuery("#header").remove(); 
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

function add_custom_sections(){
  var content_section = "<div id='acc_content'>WOOP</div>";
  $("#siteTable").after(content_section);
}

function replace_next_button(){
  // Returns a reference to the next button
}

function show_details(post){
  // Get post identifier...
  var post_id = $(post).attr("data-fullname");
  console.log(post_id);

  // load the comments async
  
}