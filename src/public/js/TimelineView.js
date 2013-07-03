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
        throw new Errpr("View requires a container element");
      this.el = el instanceof $ ? el.get(0) : el;
      this.$el = el instanceof $ ? el : $(el);
    },

    initialize: function() {
      var self = this;

      this.listenTo(this.modelView, "setup", _.bind(this.renderFromScratch, this)); 
      this.listenTo(this.modelView, "scroll:at", function(id) {
        self.renderScrolled(this.model.get("events")[id]);  
      });
    },

    renderFromScratch: function() {

      var timeline = this.timeline = {};
      timeline.events = [];

      timeline.absLen = 500;
      timeline.xOffset = 40;
      timeline.line_width = 1;
      timeline.yOffset = 10;

      var paper = this.paper = Raphael(this.el, 60, 700);
      var tl = paper.path("M" + timeline.xOffset + " " + timeline.yOffset + "V" + (timeline.yOffset + timeline.absLen));

      var evts = this.model.get("events");
      /*
      var tlStart = new Date(evts[0].time[0]);
      var last_evt = evts[evts.length - 1];
      var tlEnd =  new Date(last_evt.time[last_evt.time.length - 1]);
      var tlRange = tlStart - tlEnd;

      var llen = 0;
      //*/
      for (var i = 0; i < evts.length; i++) {
        var start_time = new Date(evts[i].time[0]);
        //var offsetFromStart = scale(tlRange, tlLen, start_time, tlStart);
        //console.log(offsetFromStart);

        times = [];
        times.push(start_time);
        paper.setStart();
        var circ = paper.circle(timeline.xOffset + timeline.line_width/2, timeline.yOffset, 5);
        circ.attr("fill", "#A0A0A0");
        circ.data("id", evts[i].id);
        var id = evts[i].id;
        console.log(id);
        var modelView = this.modelView

        /*
        if (evts[i].time.length > 1) {
          var end_time = new Date(evts[i].time[evts[i].time.length - 1]);
          var segmentLen = scale(tlRange, tlLen, end_time, start_time);
          var pathStr = "M" + xOffset + " " + (yOffset + offsetFromStart) + "V" + (yOffset + offsetFromStart + segmentLen);
          console.log(pathStr);
          var path = paper.path(pathStr);
        }
        //*/
        var markerSet = paper.setFinish();
        markerSet.data("id", evts[i].id);
        markerSet.click(function() {
          console.log(this.data("id"));
          modelView.scrollHasReached(this.data("id"));          
        });

        console.log(markerSet);
        timeline.events.push({id: evts[i].id, marker: markerSet, time: times});
        
        /*
        if (evts[i].events) {
          for (var j = 0; j < evts[i].events.length; j++) {
            if (evts[i].events[j].time) {
              var subStart = evts[i].events[j].time[0];
              var subEnd = evts[i].events[j].time[evts[i].events[j].time.length - 1];
              console.log(evts[i].events[j].title);
              drawTimeBlock(this.paper, range, start_time, line_length, line_width, x_offset, y_offset, subStart, subEnd, "sub", this.modelView, evts[i].events[j]);
            }

          }
          //*/
        //}
      }
      linearTransform(timeline);
      return this;
    }, 



    renderScrolled: function(event) {
      for (var i = 0; i < this.events.length; i++){
        
        var evt = this.events[i];

        if(event.id == evt.id) {
          evt.marker.attr("fill", "#fff");
        } else {
          evt.marker.attr("fill", "#A0A0A0");
        }
      }
      //this.el.innerHTML = event.time;
      //this.events[event.id + 1].marker.attr("fill", "blue");
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
      console.log(offsetFromStart);
      var properties = {
        cx: timeline.xOffset,
        cy: (timeline.yOffset + offsetFromStart)
      }
      events[i].marker.animate(properties, 3000, "linear");
    }
  }

  /* 
    Takes in the timeline object and returns it with an updated arrtay of points that have been transformed such that they
    are equally spaced 
  */
  function nonlinearTransform(obj, events) {

  }

  function scale(tlRange, tlLen, point1, point2) {
    return (tlLen * (point2 - point1)/tlRange);
  }

  function drawTimeBlock(paper, tlRange, tlStart, tlLen, tlWidth, tlXOff, tlYOff, curStart, curEnd, type, model, evt) {
    var start_time = new Date(curStart);
    var end_time = new Date(curEnd);
    var block_length = (tlLen * (end_time - start_time)/tlRange);
    block_length == 0? block_length++ : block_length;
    var block_offset = tlLen * (start_time - tlStart)/tlRange;
    var block = paper.rect(tlXOff, tlYOff + block_offset, tlWidth, block_length);
    block.attr("stroke", "#fff");
    if (type == "main") {
      var circ = paper.circle(tlXOff + tlWidth/2, tlYOff + block_offset, 5);
      circ.attr("fill", "#A0A0A0");
      circ.attr("stroke", "#fff");
      circ.data("id", evt.id);
      circ.click(function(){
        eve("timeChange", evt.id);
        //make this a different color
        this.attr("fill", "Red");
        model.scrollHasReached(evt.id);


        return this;

      });
      return circ;
    } else {
      var pathStr = "M";
      pathStr += tlXOff + " " + (tlYOff + block_offset) + "H" + (tlXOff + tlWidth); 
      paper.path(pathStr).attr("stroke-width", ".5");
    }
    //var label = paper.text(10, tlYOff + block_offset, curStart);
  }



})();

