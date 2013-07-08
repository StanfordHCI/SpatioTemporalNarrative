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
    },

    renderFromScratch: function() {

      this.paper ? this.paper.clear() : this.paper = Raphael(this.el, 60, 700);

      var timeline = this.timeline = {};
      timeline.events = [];

      timeline.absLen = 585;
      timeline.xOffset = 60;
      timeline.line_width = 1;
      timeline.yOffset = 50;
      timeline.markerWidth = 30;
      timeline.markerHeight = 2;

      var paper = this.paper;
      
      var tl = paper.path("M" + timeline.xOffset + " " + (timeline.yOffset - 15) + "V" + (timeline.yOffset + timeline.absLen + 100));

      var evts = this.model.get("events");
      var modelView = this.modelView
      
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

      var handleMove = function(e) {
        e.preventDefault();

        var maxMarkerHeight = 10; 
        var maxMarkerWidth = 50;
        var xPos = e.pageX;
        var yPos = e.pageY;

        var sd = timeline.sd || (timeline.absLen/timeline.events.length);

        var currEvt = paper.getElementByPoint(timeline.xOffset - 30, yPos);
        if (currEvt) {
          if (this.currentMarker) this.currentMarker.attr("stroke", "#4479BA");
          this.currentMarker = currEvt;
          this.currentMarker.attr("stroke", "yellow");
        }

        for (var i = 0; i < timeline.events.length; i++) {

          timeline.events[i].marker.forEach(function(obj){

            var currY = obj.attr("y");
              
            var transformFactor = Math.pow((currY - yPos), 2)/(2 * Math.pow(sd,2)) * -1;
            transformFactor = Math.exp(transformFactor);


            var newH = maxMarkerHeight * transformFactor;
            var newW = maxMarkerWidth * transformFactor;

            if (newH < timeline.markerHeight) newH = timeline.markerHeight;
            if (newW < timeline.markerWidth) newW = timeline.markerWidth;

            var newY;

            obj.attr("y") > yPos ? newY = obj.data("y")  + transformFactor * 10 : newY = obj.data("y") - transformFactor * 10;
            
            var properties = {
              y: newY,
              height: newH,
              width: newW,
              x: (timeline.xOffset - newW)
            };
            obj.animate(properties, 100, "linear");

            /*

            if (yPos >= obj.attr("y") && yPos <= (obj.attr("y") + obj.attr("height"))) {
              if (this.currentMarker) this.currentMarker.attr("stroke", "#4479BA");          
              this.currentMarker = timeline.events[i].marker;
              this.currentMarker.attr("stroke", "yellow");
            }

            */
          });
        }
      }

      var handleLeave = function(e) {
        e.preventDefault();
        if (this.currentMarker) modelView.scrollHasReached(this.currentMarker.data("id"));
        for (var i = 0; i < timeline.events.length; i++) {
          timeline.events[i].marker.forEach(function(obj){
            var properties = {
              "y" : obj.data("y"),
              "height" : 2,
              "x" : (timeline.xOffset - 30),
              "width" : timeline.markerWidth
            }
            obj.attr(properties);
          });
        }
      }

      this.el.addEventListener("touchstart",  handleMove, false);
      this.el.addEventListener("touchmove",   handleMove, false);
      this.el.addEventListener("touchend",    handleLeave, false);
      this.el.addEventListener("touchleave",  handleLeave, false);
      this.el.addEventListener("touchcancel", handleLeave, false);


      linearTransform(timeline);
      return this;
    }, 



    renderScrolled: function(event) {
      console.log(event.id)
      if (this.currentMarker) {
        this.currentMarker.attr("fill", "#fff");
        this.currentMarker.attr("stroke", "#4479BA");
        //this.currentMarker[1].attr("stroke-opacity", 0);
      }
      for (var i = 0; i < this.timeline.events.length; i++){
        var evt = this.timeline.events[i];
        

        if(event.id === evt.id) {
          console.log("accessed:" + evt.id + " at " + evt.marker);
          this.currentMarker = evt.marker;
          //this.currentMarker[1].attr("stroke-opacity", 1);
          this.currentMarker.attr("fill", "red");
          this.currentMarker.attr("stroke", "red");
          
          break;
        }

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
    Takes in the touch's current y position and timeline and calculates the standard 
    deviation based on that y position as the mean.
  */
  /*

  function standardDeviation(mean, timeline) {
    var difSum = 0;
    for (var i = 0; i < timeline.events.length; i++) {
      var currEvt = timeline.events[i];
      var difSq = currEvt.marker[0].data("y") - mean;
      difSq *= difSq;
      if (difSq > 10000) break;
      difSum += difSq;
    }
    var variance = difSum / timeline.events.length;
    var sd = Math.sqrt(variance);
    return sd;
  }
  //*/

  /* 
    Takes in the timeline object and updates the position of its markers to
    display a linear representation of the times in which the events occured
  */
  function linearTransform(timeline) {
    var events = timeline.events;

    var tlStart = new Date(events[0].time[0]);
    var last_evt = events[events.length -1];
    var tlEnd = new Date(last_evt.time[last_evt.time.length - 1]);
    var tlRange = tlEnd - tlStart;

    for (var i = 0; i < events.length; i++) {
      var currStart = events[i].time[0];
      var offsetFromStart = scale(tlRange, timeline.absLen, tlStart, currStart);

      var properties = {
        x: (timeline.xOffset - 30),
        y: (timeline.yOffset + offsetFromStart)
      }
      if (events[i].time.length > 1) {
        var currEnd = events[i].time[events[i].time.length - 1];
        var segmentLen = scale(tlRange, timeline.absLen, currStart, currEnd);
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
        //x: (timeline.xOffset - 10),
        y: (timeline.yOffset + offsetFromStart)
      };
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

  function scale(tlRange, tlLen, point1, point2) {
    date1 = new Date(point1);
    date2 = new Date(point2);
    return (tlLen * (date2 - date1)/tlRange);
  }



})();

