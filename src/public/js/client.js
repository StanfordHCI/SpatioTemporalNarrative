

//Disable scrolling on the ipad
document.ontouchstart = function(e){ 
    e.preventDefault(); 
}

//This is our main entrypoint

$.ajax("/data", {
  success: function(data,status,xhr) {
    console.log(data);
    $("#serverData1").html("AJAX request result: " + JSON.stringify(data));
  }
})