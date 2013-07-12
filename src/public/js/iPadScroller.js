// iOS disables JavaScript execution during page scrolls, 
// which prevents us from doing nice visual effects as the person scrolls the page around. 
// To get around this, we disable native scrolling, and implement
// our own scroller that listens for touch gestures on an element.
// Naturally it is quite bare-bones compared to native scrolling.
// Inspired by [How to build parallax scrolling on iOS](http://stackoverflow.com/questions/9592788/how-to-build-parallax-scroll-on-an-ios-device)
//
// This uses the **revealing module** pattern to make iPadScroller an object with two public functions on it. See the end of the file.
iPadScroller = (function() {


  // This stops the iPad from doing any scrolling
  function disableDefaultScrolling() {
    document.ontouchmove = function(e) {
      e.preventDefault();
    };
  }

  // This implemented an approach to do scrolling while doing JavaScript computation on the iPad
  // by doing a CSS transform as a touch moves, rather than invoking
  // the browser's default scroll behavior.
  // This uses the **delegate** pattern to 
  //
  //  @listenEl  - Element - the element on which touches are captured
  //  @scrollEl  - Element - the element that is scroller
  //  @delegate - fn(int,isDone) - a hook to interrupt scrolling and capture scroll progress
  // 
  function createScroller(listenEl, scrollEl, delegate) {

    //Variables to help during scroll operations
    var startY = 0;  
    var currentY = 0;

    //Get the total height of the element that we want to scroll.
    var maxY = scrollEl.scrollHeight;


    //Here we handle when a touch starts, but recording its position.
    var handleStart  = function(e) {
      var touches = e.changedTouches;
      if (touches.length > 0) {
        startY = touches[0].pageY;
      }
    };

    //Event handling function for moves
     var handleMove   = function(e) {
       moveOrEnd(e);
     };

     //Event handling function for anything that finished the touch
     var handleDone    = function(e) {
       moveOrEnd(e, true);
     };

    // Here we handle touches moving or ending,
    // by calculating their offset from the start and calling out to the scroll function.
    var moveOrEnd = function(e, isDone) {
      e.preventDefault();
      var touches = e.changedTouches;
      if (touches.length > 0) {
        var newY = touches[0].pageY;
        var offsetY = newY - startY;
        scrollFn(offsetY, isDone);
      }
    }

    //The scroll function calculates a new position for the element,
    //potentially clamping it if it is beyond the element's boundaries,
    //and calls `doScroll` to actually apply the scroll.
    var scrollFn = function(offsetY, isDone) {

      var newY = currentY + offsetY;
      if (newY > 0)
        newY = 0;
      // It's unclear when we want to actually stop the scroll, so we leave this blank.
      // if (newY < -maxY + screen.width)
      //   newY = -maxY + screen.width;

      doScroll(newY, isDone);
    }

    //This injects the delegate function into the new position calculation,
    //giving an external function an opportunity to influence the scroll's behaviour,
    //and applies a CSS3 transform to actually move the element on screen.
    var doScroll = function(newY, isDone) {
      if (delegate)
        newY = -delegate(-newY, isDone);  

      if (isDone)
        currentY = newY;

      scrollEl.style.webkitTransform = 'translate(0, ' + newY + 'px)';
    }

    //Register all the touch-based event listeners.
    listenEl.addEventListener("touchstart",  handleStart, false);
    listenEl.addEventListener("touchmove",   handleMove,  false);
    listenEl.addEventListener("touchend",    handleDone,  false);
    listenEl.addEventListener("touchleave",  handleDone,  false);
    listenEl.addEventListener("touchcancel", handleDone,  false);

    //Give the delegate function a chance to initialze itself with a start position of 0
    if (delegate)
      delegate(0);

    //Return an object that allow the creator to force scrolls, and destroy all the event handlers.
    return {
      scrollTo: function(pix, skipDelegate) {
        doScroll(-1*pix,true, skipDelegate);
      },
      destroy: function() {
        scrollEl.style.webkitTransform = 'translate(0px, 0px)';
        listenEl.removeEventListener("touchstart",  handleStart);
        listenEl.removeEventListener("touchmove",   handleMove);
        listenEl.removeEventListener("touchend",    handleDone);
        listenEl.removeEventListener("touchleave",  handleDone);
        listenEl.removeEventListener("touchcancel", handleDone);
      }
    }
  }

  //Expose the two public methods of this module
  return {
    createScroller: createScroller,
    disableDefaultScrolling: disableDefaultScrolling
  }

})();

// ## Back to [NarrationView.js](NarrationView.js.html) 