MapView = (function() {

  function MapView(options) {
    this.options = options || {}; 
    this.model = options.model || undefined;
    this.modelView = options.modelView || undefined;
    this.setElement(options.el); 
    this.initialize(); 
    this._delegateEvents();
  }

  _.extend(MapView.prototype, Backbone.Events, {

    setElement: function(el) {
      if (!el)
        throw new Errpr("View requires a container element");
      this.el = el;
      this.$el = el instanceof $ ? el : $(element)
    },

    initialize: function() {
      var self = this;

      this.listenTo(this.modelView, "setup", _.bind(this.renderFromScratch, this)); 
      this.modelView.on("scroll:at", function(id) {
        self.renderScrolled(this.model.get("events")[id]);  
      });

    },

    renderFromScratch: function() {
      this.$el.html("MAPVIEW for " + this.model.get("title"));

      return this;
    },

    renderScrolled: function(event) {
      this.$el.html("SCROLL AT " + event.spatial);
    },
    
    clear: function() {

      return this;
    },

    _delegateEvents: function() {

      var self = this;

    },

  });

  return MapView;



})();

