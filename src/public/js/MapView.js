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
        throw new Error("View requires a container element");
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
      var mapOptions = {
        center: new google.maps.LatLng(47.61, -122.33),
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.SATELLITE
      };
      map = new google.maps.Map(this.el, mapOptions);

      var geocoder = new google.maps.Geocoder(); 
      var locations = this.model.get("map").poi; 

      for (i in locations) {
        var location = locations[i]; 
        if (location.type == "address") {
          var request = {
            address: location.value
          }

          geocoder.geocode(request, function(result, status) {
            if (status == google.maps.GeocoderStatus.OK) {

              var marker = new google.maps.Marker({
                position: result[0].geometry.location, 
                map: map,
                animation: google.maps.Animation.DROP,
                title: ""
              });

              map.panTo(result[0].geometry.location); 
            }
          }); 
        } else if (location.type == "point") {
          var marker = new google.maps.Marker({
            position: result[0].geometry.location, 
            map: map,
            animation: google.maps.Animation.DROP,
            title: ""
          });

          map.panTo(result[0].geometry.location); 
        } else if (location.type == "area") {
          
        }
      }
      return this; 
    },


    renderScrolled: function(event) {
      //this.$el.html("SCROLL AT " + event.spatial);
    },
    
    clear: function() {

      return this;
    },

    _delegateEvents: function() {
      //Where we hook up UI event handlers
      var self = this;

    },

  });

  return MapView;

})();

