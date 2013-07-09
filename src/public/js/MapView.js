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
        self.renderScrolled(id);
      });

    },

    renderFromScratch: function() {
      self = this;

      //Stores the zoom level when scrolled to a specific event.
      this.scrolledZoomLevel = this.model.get("scollingZoomLevel") || 14;

      //the current element highlighted on the map (point, line, area)
      currentMarker = null; 
      
      //map from event ids to points
      eventMarkers = {}; 

      //map from event ids to areas
      eventAreas = {}; 

      //map from event ids to multi-point lists
      eventLists = {}; 
      
      //map from event ids to LatLon
      eventLocations = {}; 

      //stores the bounding box for the initial map bounds.
      var bounds = new google.maps.LatLngBounds();
      
      //****************************************************************
      // IIFE for creating the map elements 
      //****************************************************************
      (function createMap() {
        
        var center; 
        var locations = self.model.get("map").poi;
        
        var obj = {
          name : "Niels"
        }

        //Find the first point with lat-lon and use as center.
        for (var i = 0; i < locations.length; i++) {
          var location = locations[i];
          if (location.type == "point") {
            center = new google.maps.LatLng(location.lat, location.lng);
            break;
          }
        }

        var zoom = this.model.get("startingZoomLevel"); 
        
        var mapOptions = {
          center: center, 
          zoom: zoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        map = new google.maps.Map(self.el, mapOptions);

      }).apply(this);
      //********************* END MAP CREATION *************************

      //****************************************************************
      // IIFE for adding all the markers
      //****************************************************************
      (function addMarkers() {

        function drawMarker(latlng, id) {
          bounds.extend(latlng); 
          var marker = null;

          setTimeout(function() {
            marker = new google.maps.Marker({
              position: latlng,
              map: map,
              // animation: google.maps.Animation.DROP,
              icon: "/marker?color=%234479BA&text=" + id
            });

            eventMarkers[id] = marker; 

            google.maps.event.addListener(marker, "click", function() {
              self.model.forAllEvents(function(event) {
                if (event.spatial == marker.getTitle()) {
                  self.modelView.scrollHasReached(event.id);
                }
              });
              map.panTo(marker.getPosition());
              map.setZoom(15);
            });

          }, 100);

          map.panTo(latlng);
        }

        function drawLine(coords, id, scale) {
          var weight = 4; 
          if (scale && !isNaN(parseInt(scale))) {
            weight = 50 - 0.00051136 * (100000 - parseInt(scale)); 
          }
          var lineSymbol = {
            path: 'M 0,-1 0,1',
            strokeColor: '#4479BA',
            strokeOpacity: 1,
            scale: 4,
            strokeWeight: weight
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
          eventLists[id] = line; 
        }

        function drawArea(coords, id) {
          var area = new google.maps.Polygon({
            paths: coords,
            strokeColor: '#4479BA',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#3368A9',
            fillOpacity: 0.25
          });
          eventAreas[id] = area; 
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

        function createEventPoint(location, id) {
          var latlng;
          if (location.type == "address") {
            (function(location, id) {
              addressToLatLng(location.value, function(result, status) {
                eventLocations[id] = result[0].geometry.location;  
                drawMarker(result[0].geometry.location, id); 
              });
            })(location, id);
          } else if (location.type == "point") {
            latlng = new google.maps.LatLng(location.lat, location.lng); 
            eventLocations[id] = latlng; 
            drawMarker(latlng, id); 
          }
        } 

        function createEventArea(area, id) {
          var coords = []; 
          var subpoints = area.value; 
          var length = subpoints.length; 
          for (i in subpoints) {
            var subpoint = subpoints[i]; 
            if (subpoint.type == "address") {
              (function(subpoint, i) {
                addressToLatLng(subpoint.value, function(result, status) {
                  coords[i] = result[0].geometry.location;
                });
              })(subpoint, i);
            } else if (subpoint.type == "point") {
              var latlng = new google.maps.LatLng(subpoint.lat, subpoint.lng); 
              coords[i] = latlng; 
            }
          }
          setTimeout(function() {
            drawArea(coords, id); 
          }, 100); 
        }

        function createEventList(list, id, scale) {
          var coords = []; 
          var subpoints = list.value; 
          var length = subpoints.length; 
          for (i in subpoints) {
            var subpoint = subpoints[i]; 
            if (subpoint.type == "address") {
              (function(subpoint, i) {
                addressToLatLng(subpoint.value, function(result, status) {
                  coords[i] = result[0].geometry.location;
                });
              })(subpoint, i);
            } else if (subpoint.type == "point") {
              var latlng = new google.maps.LatLng(subpoint.lat, subpoint.lng); 
              coords[i] = latlng; 
            }
          }
          setTimeout(function() {
            drawLine(coords, id, scale); 
          }, 1000); 
        }

        var events = self.model.get("events"); 
        var locations = self.model.get("map").poi; 
        for (i in events) {
          var iter = i; 
          if (events[i].events) {
            var subevents = events[i].events; 
            var id = i; 
            for (j in subevents) {
              var subevent = subevents[j]; 
              if (subevent.spatial) {
                var spatial = subevent.spatial; 
                for (k in locations) {
                  if (locations[k].name == spatial) {
                    var fullID = id + "." + j; 
                    if (locations[k].type == "point" || locations[k].type == "address") {
                      createEventPoint(locations[k], fullID); 
                    } else if (locations[k].type == "area") {
                      createEventArea(locations[k]); 
                    } else if (locations[k].type == "list") {
                      createEventList(locations[k], fullID, events[iter].participants[0]); 
                    }
                  }
                }
              }
            }
          }
          if (events[iter].spatial) {
            var spatial = events[iter].spatial; 
            for (j in locations) {
              if (locations[j].name == spatial) {
                if (locations[j].type == "point" || locations[j].type == "address") {
                  createEventPoint(locations[j], "" + iter); 
                } else if (locations[j].type == "area") {
                  createEventArea(locations[j], "" + iter); 
                } else if (locations[j].type == "list") {
                  createEventList(locations[j], "" + iter, events[iter].participants[0]); 
                }
              }
            }
          }
        }
      })();

      //*********************** END MARKER ADDING ***************************************

      //Fits the bounds of the map after markers were added to the bounds object.
      setTimeout(function() {
        map.fitBounds(bounds); 
      }, 1000); 

      return this;
    },

    renderScrolled: function(intID) {

      //coerce ID to string
      var id = "" + intID; 
      
      //reset the old marker back to blue
      if (currentMarker != null) {
        var num = currentMarker; 
        eventMarkers[num].setIcon("/marker?color=%234479BA&text=" + num)
      }

      if (eventMarkers[id] != null /* Current marker is a point */) {

        icon = "/marker?color=%23ff0000&text=" + id; 
        eventMarkers[id].setIcon(icon); 
        currentMarker = id; 
        map.panTo(eventMarkers[id].getPosition()); 

      } else if (eventAreas[id] != null /* Current marker is an area */) {

        var options = {
          strokeColor: "#FF0000",
          fillColor: "#FF0000"
        }; 
        eventAreas[id].setOptions(options); 
        currentMarker = null; 
        map.panTo(eventAreas[id].getPath().getAt(0)); 

      } else if (eventLists[id] != null /* Current marker is a list */) {

        var scale = parseInt(self.model.getEventById(id).participants[0]); 
        var weight = 6; 
        if (!isNaN(scale)) {
          weight = 50 - 0.00051136 * (100000 - scale); 
        }
        var lineSymbol = {
          path: 'M 0,-1 0,1',
          strokeColor: '#FF0000',
          strokeOpacity: 1,
          scale: 4, 
          strokeWeight: weight
        };

        var options = {
          icons: [{
            icon: lineSymbol,
            offset: '0',
            repeat: '15px'
          }],
        }

        currentMarker = null; 
        eventLists[id].setOptions(options); 
        debugger;
        map.panTo(eventLists[id].getPath().getAt(0)); 

      }

      //Zoom the map to the appropriate level
      if (map.getZoom() != this.scrolledZoomLevel) {
        map.setZoom(this.scrolledZoomLevel); 
      }
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
