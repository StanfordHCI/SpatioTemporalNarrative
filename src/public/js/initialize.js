
/*
 * Initialization of the entire app.
 * This is loaded from client.js, which handles all the loading,
 * and runs when all the DOM is loaded.
 */

$(document).ready(function(event) {

  console.log("STARTING ENGINES")

  var touchingEl = document;
  var scrollingEl = document.getElementById("narrative_container");

  iPadScroller.disableDefaultScrolling();
  iPadScroller.createScroller(touchingEl, scrollingEl);

  Events.Global.on("all", function(name, args) {
    console.log("Event Fired: ", name);
  });

});