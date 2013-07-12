TimelineView = (function() {

  function TimelineView(options) {

    this.options = options || {}; 
    this.model = options.model || undefined;
    this.modelView = options.modelView || undefined;
    this.setElement(options.el); 
    this.initialize(); 
    this._delegateEvents();
  }

  _.extend(TimelineView.prototype, Backbone.Events, {

    setElement: function(el) {
      if (!el)
        throw new Error("View requires a container element");
      this.el = el instanceof $ ? el.get(0) : el;
      this.$el = el instanceof $ ? el : $(el);
    },

    initialize: function() {
      var self = this;

      this.listenTo(this.modelView, "setup", _.bind(this.renderFromScratch, this)); 
      this.listenTo(this.modelView, "scroll:at", function(id) {
        self.renderScrolled(this.model.getEventById(id));  
      });

      this.paper = Raphael(this.el, 60, 700);

       
       // Handler function for touchstart and touchmove events. The timelineView stores a 
       // currentHoverMarker object that keeps track of the last peg on the timeline hit in the case of 
       // a finger drag event on the timeline. If the touch event occured over an SVG
       // object, this function sets the currentHoverMarker object that SVG object and 
       // calls drawAllPoints to redraw the timeline for the event.
      var handleMove = function(e) {
        e.preventDefault();

        var yPos = e.pageY;
        var currEvt = self.paper.getElementByPoint(self.timeline.xOffset - 30, yPos);
        if (currEvt) {
          self.currentHoverMarker = currEvt;
        }

        self.drawAllPoints(e);
      }

      
       // Handler function for touchend, leave, or cancel events. Following the
       // end of a touch event over the timeline, this function checks to see
       // if the currentHoverMarker was set as a result of that event, and if it was,
       // updates the currentMarker (represents the marker of the time that should currently
       // be represented by the three views) to be  the currentHoverMarker, sets the 
       // currentHoverMarker to null to signify that the drag event has ended, 
       // and calls scrollHasReached to notify the views to rerender themselves based
       // on the update. It then calls drawAllPoints to update the timeline to 
       // reflect the end of the drag event
      var handleLeave = function(e) {
        if (self.currentHoverMarker) {
          self.currentMarker = self.currentHoverMarker;
          self.currentHoverMarker = null;
          self.modelView.scrollHasReached(self.currentMarker.data("id"));
        }
        self.drawAllPoints();
      }

      var isTouch = "ontouchstart" in window;

      this.el.addEventListener(isTouch ? "touchstart" : "mouseover",  handleMove, false);
      this.el.addEventListener(isTouch ? "touchmove"  : "mousemove",   handleMove, false);
      this.el.addEventListener(isTouch ? "touchend"   : "click" ,    handleLeave, false);
      this.el.addEventListener("touchleave",  handleLeave, false);
      this.el.addEventListener("touchcancel", handleLeave, false);
    },

    //Sets up the properties of the timeline, draws all the objects, and calls an external
    //transformation function to set the markers in place.
    renderFromScratch: function() {
      var self = this;

      this.currentMarker = null;

      var timeline = this.timeline = {};
      //this.timeline.events is an array that keeps track of the all 
      //the times for each event and their corresponding SVG marker objects
      timeline.events = [];  

      //timeline.pageLen signifies the maximum amount of height in pixels that the 
      //timeline has to render itself             
      timeline.pageLen = 585;   

      //timeline.xOffset and timeline.yOffset represents the position of the start
      //of the timeline in pixels from the top left of the page       
      timeline.xOffset = 60;
      timeline.yOffset = timeline.yStart = 50;

      //timeline.markerWidth and markerHeight represent the normal dimensions of each
      //marker peg on the timeline
      timeline.markerWidth = 30;
      timeline.markerHeight = 2;


      var paper = this.paper;
      paper.clear();

      var evts = this.model.get("events");
      var modelView = this.modelView;

      timeline.start = new Date(evts[0].time[0]);
      var last_evt = evts[evts.length -1];
      var tlEnd = new Date(last_evt.time[last_evt.time.length - 1]);
      //timeline.range signifies the range of time from the start of the timeline to the end
      //of the timeline in milliseconds
      timeline.range = tlEnd - timeline.start; 

      //Calculates scaling factors and parameters for gaussian and laplacian transformations
      timeline.spread = 0.12;
      timeline.scale = 60;

      timeline.sigmaSq = calculateSigmaSq(timeline.pageLen, timeline.spread);
      timeline.beta = calculateBeta(timeline.pageLen, timeline.spread);
      
      var expansionAmount = laplacianExpansionAmount(timeline.pageLen, timeline.scale, timeline.beta);
      //timeline.absLen signifies the actual length of the timeline rendered
      timeline.absLen = timeline.pageLen - expansionAmount;
      timeline.yOffset += expansionAmount / 2;

       timeline.rightBorder = paper.path("M" + timeline.xOffset + " " + timeline.yStart + "V" + (timeline.yStart + timeline.pageLen));
      
      // This block iterates over all events in the model and creates corresponding timeline markers 
      // for all events and pushes those markers as well as their corresponding times into the 
      // this.timeline.events array. All markers are initially drawn in one location at the start of 
      // the timeline.
      this.model.forAllEvents(function(currEvt){
        if (currEvt.time) {
          var start_time = new Date(currEvt.time[0]);

          paper.setStart();
          var rect = paper.rect(timeline.xOffset - 30, timeline.yOffset, timeline.markerWidth, timeline.markerHeight, 0);
          rect.attr("fill", "#fff");

          // In the case that there is more than one object in the event's time array, thus signifying that
          // this event actually occured over a range of time, an associated path is drawn to represent that
          // range in addition to the start peg
          if (currEvt.time.length > 1) {
            var pathStr = "M" + timeline.xOffset + " " + timeline.yOffset + "V" + (timeline.yOffset + 1);
            var path = paper.path(pathStr)
          }

          var markerSet = paper.setFinish();

          markerSet.attr("stroke", "#4479BA");
          markerSet.data("id", currEvt.id);

          timeline.events.push({id: currEvt.id, marker: markerSet, time: currEvt.time});
        }
      });

      // Moves all the timeline markers from the positions they were initially drawn in 
      // to new positions with that represent the linearly interpolated point of their 
      // occurance over the entire length of the narrative 
      linearTransform(timeline);
      return this;
    }, 

    
    // Handler for the call:at event. Finds the event's corresponding
    // SVG object, updates the currentMarker as that object, and
    // calls drawAllPoints to rerender the view.
    renderScrolled: function(event) {
      var events = this.timeline.events;
      for (var i = 0; i < events.length; i++){
        if(event.id === events[i].id) {
          this.currentMarker = events[i].marker[0];
          break;
        }
      }
      this.drawAllPoints();
    },

    
    //  Takes in an optional touch event evt and iterator function. If the
    //  timeline view is being interacted, drawAllPoint redraws the
    //  timeline based on the marker that was last hovered over. If there is
    //  no event passed in, it redraws the timeline based on the currentMarker
    drawAllPoints: function(evt, iterFunc) {

      var timeline = this.timeline;

      // maxMarkerWidth represents the maximum width to which a marker can expand
      var maxMarkerWidth = 50;
 
      // This block sets the yPos, y position that will serve as the mean or peak point for the laplacian transform.
      // If an event has been passed in, the yPos will be the y position of the event. If there is no event and 
      // there is a currentMarker, the yPos is the initial y poisition of the currentMarker. Otherwise, yPos retains its
      // intialized value of 0.
      var yPos = 0;
      if (evt) {
        yPos = evt.pageY;
      } else if (this.currentMarker) {  
        yPos = this.currentMarker.data("y");
      }

      var newW = timeline.markerWidth;
      var newY;
      
      var self = this;

      // For each set of objects in the timeline.events array, this block assigns new 
      // attributes to each SVG marker object based on the current state
      for (var i = 0; i < timeline.events.length; i++) {

        timeline.events[i].marker.forEach(function(obj){

          var currY = newY = obj.data("y");

          // If drawAllPoints is being called in response to a touchstart or touchmove event,
          // this block calculates and applies the laplacian transformation to the marker's position
          // and width
          if (evt) {
            transformFactor = laplacian(currY, yPos, timeline.beta);

            newW = maxMarkerWidth * transformFactor;

            if (newW < timeline.markerWidth) newW = timeline.markerWidth;
            newY = offsetByLaplacian(currY, yPos, timeline.beta, timeline.scale);

          }


          var properties = {
            y: newY,
            width: newW,
            x: (timeline.xOffset - newW),
            fill: "white",
            stroke: "#4479BA"
          };
          
          // If a currentMarker is set, make the set the marker's fill and stroke to red. Else,
          // If a currentHoverMarker is set, make it's stroke red, but keep its fill the same
          if (self.currentMarker && obj.data("id") === self.currentMarker.data("id")) {
            properties.fill = "red";
            properties.stroke = "red";
          } else if (self.currentHoverMarker && obj.data("id") === self.currentHoverMarker.data("id")) {
            properties.stroke = "red";

          } 
            
          obj.attr(properties);

        });
      }
    },
    
    clear: function() {

      return this;
    },

    _delegateEvents: function() {
      //Where we hook up UI event handlers
      var self = this;

    },

  });

  return TimelineView;

  
  //  Takes in all parameters needed to calculate a laplacian transformation
  //  factor as well as a scale value, calculates the laplacian, and multiplies
  //  it by the scale value to return the offset
  function offsetByLaplacian(x, mu, beta, scale) {
    var transformFactor = scale * (1 - laplacian(x, mu, beta));
    if (x > mu)
      return x + transformFactor
    else 
      return x - transformFactor;
  }

  
  //  Takes in the length of the available space of the timeline, the
  //  timeline's constant scaling factor, and a beta value to calculate
  //  the laplacian displacement factor. It returns the amount that the
  //  timeline would need to expand by on both sides to accomodate all of
  //  the points when they are displaced by the laplacian at any given time
  function laplacianExpansionAmount(availableSize, scale, beta) {
    return 2 * scale * (1 - laplacian(availableSize, 0, beta));
  }

  
  //  Calculates and returns a gaussian transformation factor based for a given point
  //  x, based on the spread center at mu, and a beta value to control the spread
  function laplacian(x, mu, beta) {
  return Math.exp(Math.abs(x - mu)/(beta) * -1);
  }

  
  // Calculates and returns a gaussian transformation factor based for a given point
  // x, based on the spread center at mu, and a sigma squared value, sigmasq,
  // to control the spread
  function gaussian(x, mu, sigmasq) {
    return Math.exp(Math.pow((x - mu),2)/(2*sigmasq) * -1);
  }

  
  // Takes in the maximum length that the timeline can be rendered in in pixels 
  // and the desired pixel spread. Teturns the sigma squared value for a gaussian 
  // function based on those values
  function calculateSigmaSq(totalLen, spread) {
    var lengthSpread = totalLen/2;
    var sigmaSq = (lengthSpread * lengthSpread)/(-2 * Math.log(spread));
    return sigmaSq;
  }

  
  // Takes in the maximum length that the timeline can be rendered in in pixels 
  // and the desired pixel spread. returns beta for a laplacian function based 
  // on those values
  function calculateBeta(totalLen, spread) {
    var lengthSpread = totalLen/2;
    var beta = Math.abs(lengthSpread)/(-1 * Math.log(spread));
    return beta;
  }

  // Takes in the timeline object and updates the position of its markers to
  // display a linear representation of the times in which the events occured
  function linearTransform(timeline) {
    var events = timeline.events;

    // for each event in the timeline.events array, this block linearly interpolates 
    // from the time the event occured relative to the start of the narrative to its
    // according pixel position on the timeline object and updates that objects' attributes
    for (var i = 0; i < events.length; i++) {
      var currStart = events[i].time[0];
      var offsetFromStart = lerp(timeline.range, timeline.absLen, timeline.start, currStart);

      var properties = {
        x: (timeline.xOffset - 30),
        y: (timeline.yOffset + offsetFromStart)
      }
      //If the event occurs over a range of time, modify the properites for that
      // representative path as well
      if (events[i].time.length > 1) {
        var currEnd = events[i].time[events[i].time.length - 1];
        var segmentLen = lerp(timeline.range, timeline.absLen, currStart, currEnd);
        properties.path = "M" + timeline.xOffset + " " + properties.y + "V" + (properties.y + segmentLen);
      }
      events[i].marker.data("y", properties.y);
      events[i].marker.attr(properties);
    }
  }

   
  //  Takes in the timeline object and updates the positions of its markers to 
  //  display an evenly spaced, non-linear representation
  function nonlinearTransform(timeline) {
    var events = timeline.events;

    var spacing = timeline.absLen / events.length;
    timeline.sd = spacing;

    for (var i = 0; i < events.length; i++) {
      var offsetFromStart = spacing * i;
      var properties = {
        y: (timeline.yOffset + offsetFromStart)
      };
      if (events[i].time.length > 1) {
        properties.path = "M" + timeline.xOffset + " " + (timeline.yOffset + offsetFromStart)+ "V" + (timeline.yOffset + offsetFromStart + spacing);
      }
      events[i].marker.data("y", properties.y);
      events[i].marker.attr(properties);
    }

  }

  // Takes in a timeline range in milliseconds since 1970, the absolute length of
  // the timeline in pixels, and two points on the timeline. Returns the pixel point
  // of the second point's displacement from the first on the timeline.
  function lerp(tlRange, tlLen, point1, point2) {
    date1 = new Date(point1);
    date2 = new Date(point2);
    return (tlLen * (date2 - date1)/tlRange);
  }



})();

