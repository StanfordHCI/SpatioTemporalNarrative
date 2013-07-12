// The NarrationView renders the text and images associated with every event into 
// the left half of the iPad screen. It has the following responsibilities:
// 
// - It supports scrolling the display up and down using our iPadScroller.js library,
// - It binds itself to the ArticleModel to rerender if a new article is requested.
// - It listens for events from the ArticleViewModel to update itself if other views change
// - It emits events to the ArticleViewModel when it scrolls to a new part of the story.
NarrationView = (function() {

  function NarrationView(options) {
    this.options = options || {}; 
    this.model = options.model || undefined;
    this.modelView = options.modelView || undefined;
    this.setElement(options.el); 
    this.initialize(); 
    this._delegateEvents();
  }

  //The NarrationView extends backbone's Events stream so that it can emit events from itself
  _.extend(NarrationView.prototype, Backbone.Events, {

    //Simply checks that we have a valid HTML element to render into.
    setElement: function(el) {
      if (!el)
        throw new Errpr("View requires a container element");
      this.el = el instanceof $ ? el.get(0) : el;
      this.$el = el instanceof $ ? el : $(el);
    },

    //Here we bind ourselves to:
    // - events for new data arriving from the Model (through ArticleViewModel); and
    // - events for scrolling to different parts of the text when the user interacts with other views.
    initialize: function() {
      this.listenTo(this.modelView, "setup", _.bind(this.renderFromScratch, this)); 
      this.listenTo(this.modelView, "scroll:at", _.bind(this.possiblyScrollTo, this));

      //We have to disable the native scrolling to have the iPad not pause JS execution during scrolls.
      //We use our fancy iPadScroller library instead.
      iPadScroller.disableDefaultScrolling();

      this.options.idToPos = {};
      
      this.options.snapTo = true;

    },

    // Render from scratch is called in response to a `setup` event from the ArticleViewModel.
    // It clears any old data, and renders all the text and images into the HTML DOM.
    renderFromScratch: function() {
      var self = this;
      
      this.clear();

      var events = this.model.get("events");
      var shortName = this.model.get("shortName");

      //We use underscore.js's simple templating system to generate raw HTML, which we insert
      //into the DOM here. To see the template we render, check index.html. It is a simple
      //HTML snippet that gets generated for every event in the model.
      this.el.innerHTML = this.template({model: this.model, root:shortName, width:456});

      //A simple spinlock to wait until all images have been loaded.
      //This is necessary for the iPadScroller to be able to calculate appropriate places
      //to switch between events as the user moves the narrative up and down.
      function waitForAllImages() {
        var imgs = self.el.getElementsByTagName("img");
        for (var i = 0; i < imgs.length; i++) {
          if (!imgs[i].complete) {
            setTimeout(waitForAllImages, 50);
            return;
          }
        }

        //Here we create the iPad scroller, which is responsible for moving this view.
        //We also create a delegate function which will allow us to emit events and change our appearance
        //as the user moves around. This delegate is further down in this file.
        self.options.scroller = iPadScroller.createScroller(self.el, self.el, makeScrollDelegate(self.el, self.modelView, self));
      }
      setTimeout(waitForAllImages, 50);

      return this;
    }, 

    // This function is bound to the `scroll:at` event from the ArticleViewModel, so that other views
    // can cause our narrative view to scroll to a new event.
    // We have to prevent an infinite loop of us asking ourselves to move by checking whether
    // we're already at the appropriate event.
    possiblyScrollTo: function(id) {
      if (this.scrollAt === id) {
        return;
      }

      this.setScrollAt(id);    
      this.options.scroller.scrollTo(this.options.idToPos[id]);
    },
    
    clear: function() {
      if (this.options.scroller)
        this.options.scroller.destroy();
      this.scrollAt = null;
      this.options.idToPos = {};
      return this;
    },

    setScrollAt: function(id) {
      if (this.scrollAt === id) {
        return;
      }
      this.scrollAt = id;
      this.modelView.scrollHasReached(id);
    },

    //Here we register for user interaction with the
    //buttons we draw in our template.
    _delegateEvents: function() {

      var self = this;
      var isTouch = "ontouchstart" in window;
      
      this.$el.on(isTouch ? 'touchend' : 'mouseup', '.eventButton', function(evt) {
        var id = this.getAttribute('data_id');
        self.possiblyScrollTo(id);
      });

    },

    template: _.template(document.getElementById('tmpl-event').innerHTML)

  });

  //**************************************************
  // Here we have the scroll delegate .
  //**************************************************
  
  // ### See [iPadScroller.js](iPadScroller.js.html)
  function makeScrollDelegate(container_el, modelView, view) {


    //First we precompute all the boundaries in between the divs that represent individual events.
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

    
    function within(one, two, dist) {
      return (Math.abs(two - one) < dist);
    }

    //This is the actual delegate function we return.
    //When a scroll is performed, we check through the list of events we know about
    //to find the currently visible one, and if we just entered it, we highlight its button.
    //This is pretty shoddy coding to have the actual colors embedded into our JS, but this was a fast hack.
    //
    //Once the scroll finishes (aka the user lifts his finger), we emit an event by calling setScrollAt() on our view.
    return function(currentTop, isDone) {

      var currentEffect;
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
              effect.on = true;
              effect.el.getElementsByClassName("eventButton")[0].style.background = "red";
            }
            currentEffect = effect;
            if (isDone) {
              view.setScrollAt(effect.id);
            }
        } else {
          effect.on = false;
          effect.el.getElementsByClassName("eventButton")[0].style.background = "#4479BA";

        }
      }
      if (isDone && view.options.snapTo && within(view.options.idToPos[currentEffect.id], currentTop, 150)) {
          return view.options.idToPos[currentEffect.id];

      }
      return currentTop;
    }

  }

  return NarrationView;



})();

// ## Next see [MapView.js](MapView.js.html), [TimelineView.js](TimelineView.js.html) or [NarrationView.js](NarrationView.js.html). Or you're done!
