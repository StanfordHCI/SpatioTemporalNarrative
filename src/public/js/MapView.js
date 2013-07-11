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

      var config = this.config = {};

      //the current element highlighted on the map (point, line, area)
      config.currentMarker = null; 
      
      //map from event ids to points
      config.eventMarkers = {}; 

      //map from event ids to areas
      config.eventAreas = {};

      //map from spatial names to Google objects
      config.poiMapObjects = {};

      //map from event ids to multi-point lists
      config.eventLists = {}; 
      
      //map from event ids to LatLon
      config.eventLocations = {}; 

      //Stores which event ID we are currently on
      config.atCurrentId = null;

      //stores the bounding box for the initial map bounds.
      var bounds = new google.maps.LatLngBounds();
      var boundsCount = 0;

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
          boundsCount += 1;
          var marker = null;

          marker = new google.maps.Marker({
            position: latlng,
            map: map,
            animation: google.maps.Animation.NONE,
            icon: generateMarkerSVG(id.toString(), "rgb(68,121,186)", "red")
          });

          config.eventMarkers[id] = marker; 

          google.maps.event.addListener(marker, "click", function() {
            if (config.currentMarker != null) {
              var num = config.currentMarker; 
              config.eventMarkers[num].setIcon(generateMarkerSVG(num.toString())); 
            }

            marker.setIcon(generateMarkerSVG(id.toString(), "red")); 
            config.currentMarker = id; 
            map.panTo(config.eventMarkers[id].getPosition()); 
            self.modelView.scrollHasReached(id); 
          });
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
          config.eventLists[id] = line; 
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
          config.eventAreas[id] = area; 
          area.setMap(map);
          return area;
        }

        var geocoder = new google.maps.Geocoder();
        function addressToLatLng(poi, callback) {
          var request = {
            address: poi.value
          }
          geocoder.geocode(request, function(result, status) {
            if (status == google.maps.GeocoderStatus.OK) {
              callback(null, result);
            } else {
              callback("FUCK", null);
            }
          });
        }

        function createEventPoint(location, id) {
          var latlng;
          
          if (location.type == "address") {
            
            (function(location, id) {
              addressToLatLng(location, function(err, result) {
                config.eventLocations[id] = result[0].geometry.location;  
                drawMarker(result[0].geometry.location, id); 
              });
            })(location, id);

          } else if (location.type == "point") {
          
            latlng = new google.maps.LatLng(location.lat, location.lng); 
            config.eventLocations[id] = latlng; 
            drawMarker(latlng, id); 
          
          }

        } 

        function createEventArea(area_poi, id) {
          if (config.poiMapObjects[area_poi.name]) {
            config.eventAreas[id] = config.poiMapObjects[area_poi.name];
          } else {
            var coords = []; 
            var subpoints = area_poi.value; 
            var length = subpoints.length; 
            for (i in subpoints) {
              var subpoint = subpoints[i]; 
              if (subpoint.type == "address") {
                throw new Error("Does not support address subpoints");
              } else if (subpoint.type == "point") {
                var latlng = new google.maps.LatLng(subpoint.lat, subpoint.lng); 
                coords[i] = latlng; 
              }
            }
            config.poiMapObjects[area_poi.name] = drawArea(coords, id);             
          }

        }

        function createEventList(list, id, scale) {

          
          var subpoints = list.value; 
          var length = subpoints.length; 

          //Please Lord forgive me
          if (subpoints[0].type == "address") {
            //Assume everything is an address

            async.map(subpoints, addressToLatLng, function(err, results) {

              var coords = new Array(results.length);
              results.forEach(function(geocodedLocation, i) {
                var latlng = new google.maps.LatLng(geocodedLocation[0].geometry.location.lat(), geocodedLocation[0].geometry.location.lng()); 
                coords[i] = latlng; 
              });
              drawLine(coords, id, scale);

            });

          } else {
            //Assume everything is a point

            var coords = new Array(subpoints.length);
            subpoints.forEach(function(point, i) {
              var latlng = new google.maps.LatLng(point.lat, point.lng); 
              coords[i] = latlng; 
            });
            drawLine(coords, id, scale);
          }

        }

        var events = self.model.get("events"); 
        var locations = self.model.get("map").poi; 

        var numberOfPoints = 0;
        self.model.forAllEvents(function(event) {
          if (event.spatial) {
            var spatial = event.spatial; 
            for (j in locations) {
              if (locations[j].name == spatial) {
                if (locations[j].type == "point" || locations[j].type == "address") {
                  numberOfPoints += 1;
                  createEventPoint(locations[j], event.id); 
                } else if (locations[j].type == "area") {
                  createEventArea(locations[j], event.id); 
                } else if (locations[j].type == "list") {
                  createEventList(locations[j], event.id, event.participants[0]); 
                }
              }
            }
          }

        });

        //Spinlock to fit the bounds of the map after markers were added to the bounds object.
        function spinUntilAllMarkers() {
          if (boundsCount == numberOfPoints) {
            map.fitBounds(bounds); 
          } else {
            setTimeout(spinUntilAllMarkers, 10);
          }
        }
        setTimeout(spinUntilAllMarkers, 10);

      })();

      //*********************** END MARKER ADDING ***************************************

      

      return this;
    },

    renderScrolled: function(intID) {
      var config = this.config;

      //coerce ID to string
      var id = intID.toString(); 

      if (config.atCurrentId === id) {
        return;
      }
      config.atCurrentId = id;

      //reset the old marker back to blue
      if (config.currentMarker != null) {
        var curr = config.currentMarker; 
        if (config.eventMarkers[curr] != null /* Current marker is a point */) {
          var icon = generateMarkerSVG(curr.toString())
          config.eventMarkers[curr].setIcon(icon); 

        } else if (config.eventAreas[curr] != null /* Current marker is an area */) {

          var options = {
            strokeColor: "#4479BA",
            fillColor: "#4479BA"
          }; 
          config.eventAreas[curr].setOptions(options); 

        } else if (config.eventLists[curr] != null /* Current marker is a list */) {
          var scale = parseInt(self.model.getEventById(curr).participants[0]); 
          var weight = 6; 
          if (!isNaN(scale)) {
            weight = 50 - 0.00051136 * (100000 - scale); 
          }
          var lineSymbol = {
            path: 'M 0,-1 0,1',
            strokeColor: '#4479BA',
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

          config.eventLists[curr].setOptions(options); 
        }
      }

      if (config.eventMarkers[id] != null /* Current marker is a point */) {

        icon = generateMarkerSVG(id.toString(), "red"); 
        config.eventMarkers[id].setIcon(icon); 
        config.currentMarker = id; 
        map.panTo(config.eventMarkers[id].getPosition()); 

      } else if (config.eventAreas[id] != null /* Current marker is an area */) {

        var options = {
          strokeColor: "#FF0000",
          fillColor: "#FF0000"
        }; 
        config.eventAreas[id].setOptions(options); 
        config.currentMarker = id; 
        map.panTo(config.eventAreas[id].getPath().getAt(0)); 

      } else if (config.eventLists[id] != null /* Current marker is a list */) {

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

        config.currentMarker = id; 
        config.eventLists[id].setOptions(options); 
        map.panTo(config.eventLists[id].getPath().getAt(0)); 

      }

      //Zoom the map to the appropriate level
      /*
      if (map.getZoom() != this.scrolledZoomLevel) {
        map.setZoom(this.scrolledZoomLevel); 
      }
      */
    },
    
    clear: function() {
      return this;
    },

    _delegateEvents: function() {
      //Where we hook up UI event handlers
      var self = this;

    },

  });


  //****************************************
  // Here we generate SVG markers for the map client-side.
  // We hash them to a data-uri, which we cache
  //****************************************
  

  var svgText = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
  svgText += '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="30" height="38">'
  svgText += '  <polygon points="0,0 0,32 12,32 15,38 18,32 30,32 30,0" style="fill:<%COLOR%>;stroke-width:0.5;stroke:black;stroke-location:inside;"/>'
  svgText += '  <text style="font-family:museo,Helvetica; font-weight:100; text-anchor:middle; font-size: 10pt; baseline-shift:-33%;" x="15" y="16" fill="white"><%TEXT%></text>'
  svgText += '</svg>'

  var memoizeSVG = {};
  window.memoizeSVG = memoizeSVG;
  function generateMarkerSVG(text, color, alt_color) {
    var color = color || "rgb(68,121,186)"; 
    var alt_color = alt_color || "red";
    var text = text || "-"; 

    var hash = color + "--HASH--" + text;
    var alt_hash = alt_color + "--HASH--" + text;
    if (memoizeSVG[hash]) {
      console.log("MEMO")
      return memoizeSVG[hash];
    }

    var newText = svgText.replace("<%TEXT%>", text).replace("<%COLOR%>", color);
    var altText = svgText.replace("<%TEXT%>", text).replace("<%COLOR%>", alt_color);

    var b64 = "data:image/svg+xml;base64," + Base64.encode(newText);
    var alt_b64 = "data:image/svg+xml;base64," + Base64.encode(altText);

    memoizeSVG[hash] = b64;
    memoizeSVG[alt_hash] = alt_b64;
    return b64;

  }


  return MapView;

})();
