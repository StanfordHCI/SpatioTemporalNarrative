iPadScroller = (function() {


  /*
   * This stops the iPad from doing any scrolling
   */
  function disableDefaultScrolling() {
    document.ontouchmove = function(e) {
      e.preventDefault();
    };
  }

  /*
   * This enables scrolling while doing computation on the iPad
   * by doing a CSS transform as a touch moves, rather than invoking
   * the browser's default scroll behavior.
   *
   *  @listenEl  - Element - the element on which touches are captured
   *  @scrollEl  - Element - the element that is scroller
   *  @scrollInterceptor - fn(int) - a hook to interrupt scrolling and capture scroll progress
   * 
   */
  function createScroller(listenEl, scrollEl, delegate) {

    var startX = 0;
    var startY = 0;  

    var currentX = 0;
    var currentY = 0;

    var $scrollEl = $(scrollEl);

    var maxY = scrollEl.scrollHeight;
   
    var scrollFn = function(offsetX, offsetY, isDone) {

      var newY = currentY + offsetY;
      // BUG:
      // if (newY > 0)
      //   newY = 0;
      // if (newY < -maxY + screen.width)
      //   newY = -maxY + screen.width;

      if (isDone)
          currentY = newY;

      if (delegate)
        newY = -delegate(-newY);  
      $scrollEl.css('-webkit-transform', 'translate(0, ' + newY + 'px)');
      
    }

    var handleStart  = function(e) {
      var touches = e.changedTouches;
      if (touches.length > 0) {
        startX = touches[0].pageX;
        startY = touches[0].pageY;
      }
    };

    var moveOrEnd = function(e, isDone) {
      e.preventDefault();
      var touches = e.changedTouches;
      if (touches.length > 0) {
        var newX = touches[0].pageX;
        var newY = touches[0].pageY;
        var offsetX = newX - startX;
        var offsetY = newY - startY;
        scrollFn(offsetX, offsetY, isDone);
      }
    }

    var handleMove   = function(e) {
      moveOrEnd(e);
    };

    var handleEnd    = function(e) {
      moveOrEnd(e, true);
    };

    var handleLeave  = function(e) {
      moveOrEnd(e, true);
    };

    var handleCancel = function(e) {
      throw new Error("Unhandled CANCEL");
    };

    listenEl.addEventListener("touchstart",  handleStart,  false);
    listenEl.addEventListener("touchmove",   handleMove,   false);
    listenEl.addEventListener("touchend",    handleEnd,    false);
    listenEl.addEventListener("touchleave",  handleLeave,  false);
    listenEl.addEventListener("touchcancel", handleCancel, false);

    if (delegate)
      delegate(0);

    return {
      destroy: function() {
        listenEl.removeEventListener("touchstart",  handleStart);
        listenEl.removeEventListener("touchmove",   handleMove);
        listenEl.removeEventListener("touchend",    handleEnd);
        listenEl.removeEventListener("touchleave",  handleLeave);
        listenEl.removeEventListener("touchcancel", handleCancel);
      }
    }
  }

  return {
    createScroller: createScroller,
    disableDefaultScrolling: disableDefaultScrolling
  }

})();