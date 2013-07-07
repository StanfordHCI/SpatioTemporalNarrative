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

      timeline.absLen = 300;
      timeline.xOffset = 60;
      timeline.line_width = 1;
      timeline.yOffset = 40;
      timeline.markerWidth = 10;
      timeline.markerHeight = 2;

      var paper = this.paper;
      
      var tl = paper.path("M" + timeline.xOffset + " " + timeline.yOffset + "V" + (timeline.yOffset + timeline.absLen));

      var evts = this.model.get("events");
      var modelView = this.modelView
      
      //creates timeline markers for all events. Markers will be repositione based on the readers' chosen transformation
      this.model.forAllEvents(function(currEvt){
        if (currEvt.time) {
          var start_time = new Date(currEvt.time[0]);

          paper.setStart();
          var rect = paper.rect(timeline.xOffset - 10, timeline.yOffset, timeline.markerWidth, timeline.markerHeight, 0);
          rect.attr("fill", "#fff");

          var label = paper.text(10, timeline.yOffset, currEvt.time[0]);
          label.attr("stroke-opacity", 0);

          if (currEvt.time.length > 1) {
            var pathStr = "M" + timeline.xOffset + " " + timeline.yOffset + "V" + (timeline.yOffset + 1);
            var path = paper.path(pathStr)
          }

          var markerSet = paper.setFinish();

          markerSet.attr("stroke", "#4479BA");
          markerSet[1].attr("fill-opacity", 0); //makes the label invisible
          markerSet.data("id", currEvt.id);

          markerSet.click(function() {
            modelView.scrollHasReached(this.data("id")); 
          });

          timeline.events.push({id: currEvt.id, marker: markerSet, time: currEvt.time});
        }
      });

      var handleMove = function(e) {
        e.preventDefault();

        var maxMarkerHeight = 10; 
        var maxMarkerWidth = 20;
        var xPos = e.pageX;
        var yPos = e.pageY;

        var currEvt = paper.getElementByPoint(xPos, yPos);
        if (currEvt) {
          modelView.scrollHasReached(currEvt.data("id"));
        }

        for (var i = 0; i < timeline.events.length; i++) {

          timeline.events[i].marker.forEach(function(obj){

            var currY = obj.attr("y");

            //currently hardcoded in for testing 
            sd = 600/7;
              
            var transformFactor = Math.pow((currY - yPos), 2)/(2 * Math.pow(sd,2)) * -1;
            transformFactor = Math.exp(transformFactor);

            var pushDown;
            currEvt && currEvt.data("id") != obj.data("id") ? pushDown = currEvt.attr("height") + 1 : pushDown = 0;

            var newH = maxMarkerHeight * transformFactor;
            var newW = maxMarkerWidth * transformFactor;

            if (newH < timeline.markerHeight) newH = timeline.markerHeight;
            if (newW < timeline.markerWidth) newW = timeline.markerWidth;

            var newY;
            if (currEvt) {
              obj.data("y") > currEvt.data("y") ? newY = obj.data("y") + pushDown + (1 - transformFactor) : newY = obj.data("y") - pushDown - (1 - transformFactor);
            } else {
              obj.attr("y") > yPos ? newY = obj.data("y") + pushDown + (1 - transformFactor) : newY = obj.data("y") - pushDown - (1 - transformFactor);
            }

            var properties = {
              y: newY,
              height: newH,
              width: newW,
              x: (timeline.xOffset - newW)
            };
            obj.attr(properties);
            //obj.animate(properties, 100, "linear");
          });
        }
      }

      var handleLeave = function(e) {
        for (var i = 0; i < timeline.events.length; i++) {
          timeline.events[i].marker.forEach(function(obj){
            var properties = {
              "y" : obj.data("y"),
              "height" : 2,
              "x" : (timeline.xOffset - 10)
            }
            obj.animate(properties, 100, "linear");
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
      for (var i = 0; i < this.timeline.events.length; i++){
        
        var evt = this.timeline.events[i];

        if(event.id == evt.id) {
          evt.marker[1].attr("stroke-opacity", 1);
          evt.marker.attr("fill", "red");
          evt.marker.attr("stroke", "red");
        } else {

          evt.marker.attr("fill", "#fff");
          evt.marker.attr("stroke", "#4479BA");
          evt.marker[1].attr("stroke-opacity", 0);
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

  /* Takes in the timeline object and returns it with an updated array of points that have been linearly transformed*/
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
        x: (timeline.xOffset - 10),
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
    Takes in the timeline object and returns it with an updated arrtay of points that have been transformed such that they
    are equally spaced 
  */
  function nonlinearTransform(timeline) {
    var events = timeline.events;

    var spacing = timeline.absLen / events.length;

    for (var i = 0; i < events.length; i++) {
      var offsetFromStart = spacing * i;
      var properties = {
        x: (timeline.xOffset - 10),
        y: (timeline.yOffset + offsetFromStart)
      };
      if (events[i].time.length > 1) {
        properties.path = "M" + timeline.xOffset + " " + (timeline.yOffset + offsetFromStart)+ "V" + (timeline.yOffset + offsetFromStart + spacing);
      }
      events[i].marker.data("y", properties.y);
      events[i].marker.attr(properties);
    }

  }

  function scale(tlRange, tlLen, point1, point2) {
    date1 = new Date(point1);
    date2 = new Date(point2);
    return (tlLen * (date2 - date1)/tlRange);
  }



})();

