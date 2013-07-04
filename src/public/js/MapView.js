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
        self.renderScrolled(this.model.getEventById(id).spatial);  
      });
    },

    renderFromScratch: function() {
      var mapOptions = {
        center: new google.maps.LatLng(47.61, -122.33),
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      map = new google.maps.Map(this.el, mapOptions);
      var self = this; 
      eventLocations = {}; 
      addMarkers(); 

      function addMarkers() {

        function createMarker(latlng) {
          var marker = new google.maps.Marker({
            position: latlng,  
            map: map,
            animation: google.maps.Animation.DROP,
            title: ""
          });
          map.panTo(latlng); 
        }

        function createLine(coords) {
          var lineSymbol = {
            path: 'M 0,-1 0,1',
            strokeColor: '#FF0000',
            strokeOpacity: 1,
            scale: 4
          };

          var line = new google.maps.Polyline({
            path: coords, 
            strokeOpacity: 0,
            icons: [{
              icon: lineSymbol,
              offset: '0',
              repeat: '15px'
            }],
            map: map
          });
        }

        function createArea(coords) {
          var area = new google.maps.Polygon({
            paths: coords,
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.25
          });
          area.setMap(map);
        }

        var geocoder = new google.maps.Geocoder(); 
        function addressToLatLng(address, callback) {
          var request = {
            address: address
          }
          geocoder.geocode(request, function(result, status) {
            if (status == google.maps.GeocoderStatus.OK) {
              callback(result, status); 
            }
          }); 
        }

        var locations = self.model.get("map").poi; 
        for (i in locations) {
          var location = locations[i]; 

          if (location.type == "address") {
            (function(location) {
              addressToLatLng(location.value, function(result, status) {
                eventLocations[location.name] = result[0].geometry.location; 
                createMarker(result[0].geometry.location); 
              }); 
            })(location); 
          } else if (location.type == "point") {
            var latlng = new google.maps.LatLng(location.lat, location.lng); 
            eventLocations[location.name] = latlng; 
            createMarker(latlng); 

          } else if (location.type == "area") {
            var addressCoords = []; 
            var pointCoords = []; 
            var subPoints = location.value; 
            var length = subPoints.length; 
            for (i in subPoints) {
              var subPoint = subPoints[i]; 
              if (subPoint.type == "address") {
                (function(location) {
                  addressToLatLng(subPoint.value, function(result, status) {
                    eventLocations[location.name] = result[0].geometry.location; 
                    addressCoords.push(result[0].geometry.location); 
                    if (i == length - 1) {
                      createArea(addressCoords); 
                    }
                  }); 
                })(location); 
              } else if (subPoint.type == "point") {
                var latlng = new google.maps.LatLng(subPoint.lat, subPoint.lng); 
                eventLocations[location.name] = latlng; 
                pointCoords.push(latlng); 
                if (i == length - 1) {
                  createArea(pointCoords); 
                }
              }
            }
          } else if (location.type == "list") {
            var addressCoords = []; 
            var pointCoords = []; 
            var subPoints = location.value; 
            var length = subPoints.length; 
            for (i in subPoints) {
              var subPoint = subPoints[i]; 

              if (subPoint.type == "address") {
                (function(location) {
                  addressToLatLng(subPoint.value, function(result, status) {
                    eventLocations[location.name] = result[0].geometry.location; 
                    addressCoords.push(result[0].geometry.location); 
                    if (i == length - 1) {
                      createLine(addressCoords); 
                    }
                  }); 
                })(location); 
              } else if (subPoint.type == "point") {
                var latlng = new google.maps.LatLng(subPoint.lat, subPoint.lng); 
                eventLocations[location.name] = latlng; 
                pointCoords.push(latlng); 
                if (i == length - 1) {
                  createLine(pointCoords); 
                }
              }
            }
          }
        }
      }
      return this; 
    },

    renderScrolled: function(eventName) {
      console.log(eventName); 
      console.log(eventLocations[eventName]); 
      map.panTo(eventLocations[eventName]); 
      map.setZoom(14); 
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

