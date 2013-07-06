NarrationView = (function() {

  function NarrationView(options) {
    this.options = options || {}; 
    this.model = options.model || undefined;
    this.modelView = options.modelView || undefined;
    this.setElement(options.el); 
    this.initialize(); 
    this._delegateEvents();
  }

  _.extend(NarrationView.prototype, Backbone.Events, {

    setElement: function(el) {
      if (!el)
        throw new Errpr("View requires a container element");
      this.el = el instanceof $ ? el.get(0) : el;
      this.$el = el instanceof $ ? el : $(el);
    },

    initialize: function() {
      this.listenTo(this.modelView, "setup", _.bind(this.renderFromScratch, this)); 
      this.listenTo(this.modelView, "scroll:at", _.bind(this.possiblyScrollTo, this));
      iPadScroller.disableDefaultScrolling();

      this.options.idToPos = {};
      window.nv = this;

    },

    renderFromScratch: function() {
      var self = this;
      
      this.clear();

      var events = this.model.get("events");
      var shortName = this.model.get("shortName");


      this.el.innerHTML = this.template({model: this.model, root:shortName, width:456});

      function waitForAllImages() {
        var imgs = self.el.getElementsByTagName("img");
        for (var i = 0; i < imgs.length; i++) {
          if (!imgs[i].complete) {
            setTimeout(waitForAllImages, 50);
            return;
          }
        }
        self.options.scroller = iPadScroller.createScroller(self.el, self.el, makeScrollDelegate(self.el, self.modelView, self));
      }
      setTimeout(waitForAllImages, 50);


      return this;
    }, 

    possiblyScrollTo: function(id) {
      if (this.scrollAt != id) {
        this.options.scroller.scrollTo(this.options.idToPos[id]);
        this.setScrollAt(id);
      }
    },
    
    clear: function() {
      if (this.options.scroller)
        this.options.scroller.destroy();
      this.scrollAt = "0";
      this.options.idToPos = {};
      return this;
    },

    setScrollAt: function(id) {
      this.scrollAt = id;
      this.modelView.scrollHasReached(id);
    },

    _delegateEvents: function() {

      var self = this;

    },

    template: _.template(document.getElementById('tmpl-event').innerHTML)

  });

var debug_el = document.getElementById("debug_container");
function debug() {
  //*
  var str = "";
  for (var i in arguments) {
    str += JSON.stringify(arguments[i]) + " ";
  }
  debug_el.innerHTML = str + "<br\>" + debug_el.innerHTML;
  // */
}

  //**************************************************
  // Here we have the scroll delegate 
  //**************************************************
  
  function makeScrollDelegate(container_el, modelView, view) {


    var effects = (function() {
      var result = [];


      var amountVisible = screen.width;
      var c_el = container_el.children[0];

      var children_els = c_el.children;
      for (var i = 0; i < children_els.length; i++) {

        var child = $(children_els[i]);

        var myMarginTop = parseInt( $("#myBlock").css("marginTop") );

        //start fading in when it becomes visible
        var start = child.offset().top - 50;

        view.options.idToPos[children_els[i].getAttribute("data_id")] = child.offset().top;

        result.push({
          start: start,
          el: children_els[i],
          on: false,
          id: children_els[i].getAttribute("data_id")
        });

      }

      return result;
    })();

    

    return function(currentTop) {

      var effect, start, nextStart;
      for (var i = 0; i < effects.length; i++) {
        effect = effects[i];
        start = effect.start;

        if (effects[i+1])
          nextStart = effects[i+1].start;
        else
          nextStart = start + 200;

        if (currentTop < effect.start) {
          effect.on = false;
          effect.el.getElementsByClassName("eventButton")[0].style.background = "#4479BA";

        } else if (currentTop > start && currentTop < nextStart) {
            if (!effect.on) {
              view.setScrollAt(effect.id);
              effect.on = true;
              effect.el.getElementsByClassName("eventButton")[0].style.background = "red";
            }
        } else {
          effect.on = false;
          effect.el.getElementsByClassName("eventButton")[0].style.background = "#4479BA";

        }
      }

      return currentTop;
    }

  }

  return NarrationView;



})();

