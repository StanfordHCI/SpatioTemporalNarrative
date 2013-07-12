// The function of the ViewModel is:
//  - provide **event aggregation** between views
//  - provide **container** for all the views
//  - initiate the **setup** of all the views 
ArticleViewModel = (function() {

  //Hook up the ArticleViewModel to a backend model in its initialization, 
  //and keep track of the main element to make visible or hide as the user navigates between the index and an article view.
  function ArticleViewModel(options) {
    this.model = options.model;
    this.views = {};
    this.$el = options.el;
    this.initialize();
  }

  _.extend(ArticleViewModel.prototype, Backbone.Events, {

    //This is the constructor hook, where we initialize the object on creation.
    //This only creates the necessary objects, it does not display anything.
    initialize: function() {
      var self = this;
      this.listenTo(this.model, "change", _.bind(this.setup, this));

      this.views = {
        "narrationView": new NarrationView({
          el: $("#narrative_container"),
          model: this.model,
          modelView: this
        }),
        "mapView": new MapView({
          el: $("#map_container"),
          model: this.model,
          modelView: this
        }),
        "timelineView": new TimelineView({
          el: $("#timeline_container"),
          model: this.model,
          modelView: this
        })
      }

      var isTouch = "ontouchstart" in window;

      //Lisen for touch events on the back button, and trigger an event on the viewmodel. 
      //The app can listen for this and respond to navigation events, in the style of the **observer** pattern.
      $("#buttonBack").on(isTouch ? 'touchend' : 'mouseup', function(evt) {
        self.trigger("navigate:index");
      });

    },

    //When new data arrives we start fresh by firing setup.
    //We also emit the "setup" event to notify all the child views.
    setup: function() {
      this.show();
      this.trigger("setup", this);
    },

    show: function() {
      this.$el.show();
    },
    
    hide: function() {
      this.$el.hide();
    } ,

    //**********************************************
    // API for Views to update internal state:
    //**********************************************

    //Notified that the user's scroll has reached an event;
    //This is the main **event aggregation** function all the views use to communicate with one another.
    //As the scroll reaches specific events, the subviews call this function to fire the scroll:at event,
    //and other views can respond by updating themselves for this event.
    //In other words, this is an *all-to-all* message stream for the three views, which allows us to do fancy linked displays.
    scrollHasReached: function(id) {
      this.trigger("scroll:at", id);
    }

  });

  return ArticleViewModel;


})();

// ## Next see [MapView.js](MapView.js.html), [TimelineView.js](TimelineView.js.html) or [NarrationView.js](NarrationView.js.html).