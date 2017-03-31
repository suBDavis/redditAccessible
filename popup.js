function toggle(){
  var bttn = $("#toggle");
  
  if (bttn.text() == "Disable"){
    bttn.text("Enable")
  } else {
    bttn.text("Disable")
  }
}

window.onload = function () {
  $("#toggle").on('click', toggle);
};