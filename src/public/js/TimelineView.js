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

      /* 
        Handler function for touchstart and touchmove events. Sets the currentHoverMarker if
        the touch event is over some SVG marker object and calls drawAllPoints to redraw the
        timeline for the event
      */
      var handleMove = function(e) {
        e.preventDefault();

        var yPos = e.pageY;
        var currEvt = self.paper.getElementByPoint(self.timeline.xOffset - 30, yPos);
        if (currEvt) {
          self.currentHoverMarker = currEvt;
        }

        self.drawAllPoints(e);
      }

      /*
        Handler function for touchend, leave, or cancel events. Updates the currentMarker to
        the last marker that was hovered over (currentHoverMarker), sets the currentHoverMarker 
        to null, and calls scrollHasReached to render the updated view
      */

      var handleLeave = function(e) {
        if (self.currentHoverMarker) {
          self.currentMarker = self.currentHoverMarker;
          self.currentHoverMarker = null;
          self.modelView.scrollHasReached(self.currentMarker.data("id"));
        }
        self.drawAllPoints();
      }

      this.el.addEventListener("touchstart",  handleMove, false);
      this.el.addEventListener("touchmove",   handleMove, false);
      this.el.addEventListener("touchend",    handleLeave, false);
      this.el.addEventListener("touchleave",  handleLeave, false);
      this.el.addEventListener("touchcancel", handleLeave, false);
    },

    /*
      Sets up the properties of the timeline, draws all the objects, and calls an external
      transformation function to set the markers in place.
    */
    renderFromScratch: function() {
      var self = this;

      this.currentMarker = null;

      var timeline = this.timeline = {};
      timeline.events = [];
      timeline.pageLen = 585;
      timeline.xOffset = 60;
      timeline.line_width = 1;
      timeline.yOffset = timeline.yStart = 50;
      timeline.markerWidth = 30;
      timeline.markerHeight = 2;


      var paper = this.paper;
      paper.clear();

      var evts = this.model.get("events");
      var modelView = this.modelView;

      timeline.start = new Date(evts[0].time[0]);
      var last_evt = evts[evts.length -1];
      var tlEnd = new Date(last_evt.time[last_evt.time.length - 1]);
      timeline.range = tlEnd - timeline.start;

      //Calculate scaling factors and parameters for gaussian and laplacian
      timeline.spread = 0.12;
      timeline.scale = 60;

      timeline.sigmaSq = calculateSigmaSq(timeline.pageLen, timeline.spread);
      timeline.beta = calculateBeta(timeline.pageLen, timeline.spread);
      
      var expansionAmount = laplacianExpansionAmount(timeline.pageLen, timeline.scale, timeline.beta);
      timeline.absLen = timeline.pageLen - expansionAmount;
      timeline.yOffset += expansionAmount / 2;

      //Draws the timeline
       timeline.rightBorder = paper.path("M" + timeline.xOffset + " " + timeline.yStart + "V" + (timeline.yStart + timeline.pageLen));
      
      //creates timeline markers for all events. Markers will be repositione based on the readers' chosen transformation
      this.model.forAllEvents(function(currEvt){
        if (currEvt.time) {
          var start_time = new Date(currEvt.time[0]);

          paper.setStart();
          var rect = paper.rect(timeline.xOffset - 30, timeline.yOffset, timeline.markerWidth, timeline.markerHeight, 0);
          rect.attr("fill", "#fff");

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

      linearTransform(timeline);
      return this;
    }, 

    /*
      Handler for the call:at event. Finds the event's corresponding
      SVG object and update the currentMarker as that marker and then
      calls drawAllPoints to redraw the view.
    */
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

    /*
      Takes in an optional touch event evt and iterator function. If the
      timeline view is being interacted, drawAllPoint redraws the
      timeline based on the marker that was last hovered over. If there is
      no event passed in, it redraws the timeline based on the currentMarker
      and its parent events, if any.
    */
    drawAllPoints: function(evt, iterFunc) {

      var timeline = this.timeline;

      var maxMarkerHeight = 7; 
      var maxMarkerWidth = 50;
 
      //sets the y position that will serve as the mean or peak point for the laplacian transform
      //if an event has been passed in, the y position will be the y position of the event
      //if there is no event and there is a currentMarker, the y position is the initial y poisition of the currentMarker
      var yPos = 0;
      if (evt) {
        yPos = evt.pageY;
      } else if (this.currentMarker) {  
        yPos = this.currentMarker.data("y");
      }

      var newH = timeline.markerHeight;
      var newW = timeline.markerWidth;
      var newY;

      
      var self = this;

      //Sets the new properties for each event marker SVG object
      for (var i = 0; i < timeline.events.length; i++) {

        timeline.events[i].marker.forEach(function(obj){

          var currY = newY = obj.data("y");

          //calculates and applies the laplacian transformation if necessary
          if (evt) {
            transformFactor = laplacian(currY, yPos, timeline.beta);

            newH = maxMarkerHeight * transformFactor;
            newW = maxMarkerWidth * transformFactor;

            if (newH < timeline.markerHeight) newH = timeline.markerHeight;
            if (newW < timeline.markerWidth) newW = timeline.markerWidth;
            newY = offsetByLaplacian(currY, yPos, timeline.beta, timeline.scale);

          }


          var properties = {
            y: newY,
            //height: newH,
            width: newW,
            x: (timeline.xOffset - newW),
            fill: "white",
            stroke: "#4479BA"
          };
          
          //Is this the currentMarker? solid red plz
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

  /*
    Takes in all parameters needed to calculate a laplacian transformation
    factor as well as a scale value, calculates the laplacian, and multiplies
    it by the scale value to return the offset
  */
  function offsetByLaplacian(x, mu, beta, scale) {
    var transformFactor = scale * (1 - laplacian(x, mu, beta));
    if (x > mu)
      return x + transformFactor
    else 
      return x - transformFactor;
  }

  /*
    Takes in the length of the available space of the timeline, the
    timeline's constant scaling factor, and a beta value to calculate
    the laplacian displacement factor. It returns the amount that the
    timeline would need to expand by on both sides to accomodate all of
    the points when they are displaced by the laplacian at any given time
  */
  function laplacianExpansionAmount(availableSize, scale, beta) {
    return 2 * scale * (1 - laplacian(availableSize, 0, beta));
  }

  /*
    Calculates and returns a gaussian transformation factor based for a given point
    x, based on the spread center at mu, and a beta value to control the spread
  */
  function laplacian(x, mu, beta) {
  return Math.exp(Math.abs(x - mu)/(beta) * -1);
  }

  /*
    Calculates and returns a gaussian transformation factor based for a given point
    x, based on the spread center at mu, and a sigma squared value, sigmasq,
    to control the spread
  */
  function gaussian(x, mu, sigmasq) {
    return Math.exp(Math.pow((x - mu),2)/(2*sigmasq) * -1);
  }

  /*
    Takes in the pagelength of the timeline in pixels and the desired pixel spread,
    and returns the sigma squared value for a gaussian function based on those values
  */
  function calculateSigmaSq(totalLen, spread) {
    var lengthSpread = totalLen/2;
    var sigmaSq = (lengthSpread * lengthSpread)/(-2 * Math.log(spread));
    return sigmaSq;
  }

  /*
    Takes in the pagelength of the timeline in pixels and the desired pixel spread,
    and returns beta for a laplacian function based on those values
  */
  function calculateBeta(totalLen, spread) {
    var lengthSpread = totalLen/2;
    var beta = Math.abs(lengthSpread)/(-1 * Math.log(spread));
    return beta;
  }

  /* 
    Takes in the timeline object and updates the position of its markers to
    display a linear representation of the times in which the events occured
  */
  function linearTransform(timeline) {
    var events = timeline.events;


    for (var i = 0; i < events.length; i++) {
      var currStart = events[i].time[0];
      var offsetFromStart = lerp(timeline.range, timeline.absLen, timeline.start, currStart);

      var properties = {
        x: (timeline.xOffset - 30),
        y: (timeline.yOffset + offsetFromStart)
      }
      //If the event spans over a range of time
      if (events[i].time.length > 1) {
        var currEnd = events[i].time[events[i].time.length - 1];
        var segmentLen = lerp(timeline.range, timeline.absLen, currStart, currEnd);
        properties.path = "M" + timeline.xOffset + " " + properties.y + "V" + (properties.y + segmentLen);
      }
      events[i].marker.data("y", properties.y);
      events[i].marker.attr(properties);
    }
  }

  /* 
    Takes in the timeline object and updates the positions of its markers to 
    display an evenly spaced, non-linear representation
  */
  function nonlinearTransform(timeline) {
    var events = timeline.events;

    var spacing = timeline.absLen / events.length;
    timeline.sd = spacing;

    for (var i = 0; i < events.length; i++) {
      var offsetFromStart = spacing * i;
      var properties = {
        y: (timeline.yOffset + offsetFromStart)
      };
      //If the event spans over a range of time
      if (events[i].time.length > 1) {
        properties.path = "M" + timeline.xOffset + " " + (timeline.yOffset + offsetFromStart)+ "V" + (timeline.yOffset + offsetFromStart + spacing);
      }
      events[i].marker.data("y", properties.y);
      events[i].marker.attr(properties);
    }

  }

  /*
    Takes in a timeline range in milliseconds since 1970, the absolute length of
    the timeline in pixels, and two points on the timeline. Returns the pixel point
    of the second point's displacement from the first on the timeline.
  */

  function lerp(tlRange, tlLen, point1, point2) {
    date1 = new Date(point1);
    date2 = new Date(point2);
    return (tlLen * (date2 - date1)/tlRange);
  }



})();

