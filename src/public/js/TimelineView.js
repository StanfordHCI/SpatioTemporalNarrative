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

      var line_length = 600;
      var x_offset = 40;
      var line_width = 5;
      var y_offset = 10;

      var paper = this.paper = Raphael(this.el, 60, 700);
      var line = paper.rect(x_offset, y_offset, line_width,  line_length, 5);
      line.attr("fill", "#A0A0A0");
      line.attr("stroke", "#fff");

      var evts = this.model.get("events");
      var start_time = new Date(evts[0].time[0]);
      var last_evt = evts[evts.length - 1];
      var end_time =  new Date(last_evt.time[last_evt.time.length - 1]);
      var range = end_time.getTime() - start_time.getTime();
      var last_time = start_time;
      
      for (var i = 0; i < evts.length; i++) {
        var current_time = evts[i].time[0];
        var current_end_time = evts[i].time[evts[i].time.length - 1];
        drawTimeBlock(this.paper, range, start_time, line_length, line_width, x_offset, y_offset, current_time, current_end_time);
        
        if (evts[i].events) {
          for (var j = 0; j < evts[i].events.length; j++) {
            if (evts[i].events[j].time) {
              var subStart = evts[i].events[j].time[0];
              var subEnd = evts[i].events[j].time[evts[i].events[j].time.length - 1];
              console.log(evts[i].events[j].title);
              drawTimeBlock(this.paper, range, start_time, line_length, line_width, x_offset, y_offset, subStart, subEnd);
            }

          }
        }
      };


      
      //get the first and last times to figure out the range
      //for each event and subevent, iterate through and draw a rectangle
      //draw a circle and add event listeners to it 
      return this;
    }, 


    renderScrolled: function(event) {
      this.el.innerHTML = event.time;
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

  function drawTimeBlock(paper, tlRange, tlStart, tlLen, tlWidth, tlXOff, tlYOff, curStart, curEnd) {
    var start_time = new Date(curStart);
    var end_time = new Date(curEnd);
    var block_length = (tlLen * (end_time - start_time)/tlRange) + 1;
    var block_offset = tlLen * (start_time - tlStart)/tlRange;
    var block = paper.rect(tlXOff, tlYOff + block_offset, tlWidth, block_length);
    block.attr("stroke", "#fff");
    var label = paper.text(10, tlYOff + block_offset, curStart);
  }



})();

