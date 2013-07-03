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

      this.events=[];

      var tlLen = 300;
      var xOffset = 40;
      var line_width = 1;
      var yOffset = 10;

      var paper = this.paper = Raphael(this.el, 60, 700);
      var tl = paper.path("M" + xOffset + " " + yOffset + "V" + (yOffset + tlLen));

      var evts = this.model.get("events");
      var tlStart = new Date(evts[0].time[0]);
      var last_evt = evts[evts.length - 1];
      var tlEnd =  new Date(last_evt.time[last_evt.time.length - 1]);
      var tlRange = tlStart - tlEnd;

      var llen = 0;

      for (var i = 0; i < evts.length; i++) {
        var start_time = new Date(evts[i].time[0]);
        var offsetFromStart = scale(tlRange, tlLen, start_time, tlStart);
        console.log(offsetFromStart);

        var circ = paper.circle(xOffset + line_width/2, yOffset + offsetFromStart, 5);
        circ.attr("fill", "#A0A0A0");
        circ.data("id", evts[i].id);
        var id = evts[i].id;
        console.log(id);
        var modelView = this.modelView
        circ.click(function() {
          console.log(this.data("id"));
          modelView.scrollHasReached(this.data("id"));
          this.modelView.scrollHasReached(id);
          
        });
        var end_time = evts[i].time[evts[i].time.length - 1];
        var pathStr = "M" + xOffset + " " + (yOffset + offsetFromStart) + "V";
        this.events.push({id: evts[i].id, marker: circ});
        
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
      /*eve.on("timeChange", function(id) {
        for (var i = 0; i< this.events.length; i++){
        this.events[i].marker.data("id") == id ? this.events[i].marker.attr("fill", "blue") : this.events[i].marker.attr("fill", "#A0A0A0");}
      });*/
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

