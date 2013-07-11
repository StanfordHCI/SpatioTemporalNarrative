ArticleViewModel = (function() {

  // ARTICLEVIEWMODEL
  //
  // The function of the ViewModel is:
  //  - provide event aggregation between views
  //  - provide container for all the views
  //  - initiate the setup of all the views
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

      $("#buttonBack").on(isTouch ? 'touchend' : 'mouseup', function(evt) {
        self.trigger("navigate:index");
      });

    },

    //When new data arrives we start fresh by firing setup.
    //We also emit the "setup" event to notify all the child views.
    setup: function() {
      
      // RESET INTERNAL STATE HERE

      this.show();
      this.trigger("setup", this);
    },

    show: function() {
      if (this.model.get("style"))
        this.$el.addClass("articlestyle_" + this.model.get("style"));
      this.$el.show();
    },
    
    hide: function() {
      if (this.model.get("style"))
        this.$el.removeClass("articlestyle_" + this.model.get("style"));
      this.$el.hide();
    } ,

    //**********************************************
    // API for Views to update internal state:
    //**********************************************

    //Notified that the user's scroll has reached an event;
    scrollHasReached: function(id) {
      this.trigger("scroll:at", id);
    }

  });

  return ArticleViewModel;


})();