

//This is our main entrypoint

$.ajax("/data", {
  success: function(data,status,xhr) {
    console.log(data);
    $("#serverData1").html("AJAX request result: " + JSON.stringify(data));
  }
})