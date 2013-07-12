//This module uses the Google Maps API to draw the map, add markers based on event data, and respond to user interaction events
//(which may originate from other modules, such as the NarrationView or TimelineView). 

//[Google Maps API Reference](https://developers.google.com/maps/documentation/javascript/reference) 

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

    // Sets the container element for the map
    setElement: function(el) {
      if (!el)
        throw new Error("View requires a container element");
      this.el = el instanceof $ ? el.get(0) : el;
      this.$el = el instanceof $ ? el : $(el);
    },

    // Initializes event listeners for setting up the map and responding to scroll events
    initialize: function() {
      var self = this;

      this.listenTo(this.modelView, "setup", _.bind(this.renderFromScratch, this));
      this.listenTo(this.modelView, "scroll:at", function(id) {
        self.renderScrolled(id);
      });

    },

    // Responds to the "setup" event; initializes the map. 
    renderFromScratch: function() {
      self = this;

      var config = this.config = {};

      //The current element highlighted on the map (point, line, or area). 
      config.currentMarker = null; 
      
      //Map from event ids to points on the map (represented by [Google Maps Markers](https://developers.google.com/maps/documentation/javascript/reference#Marker) objects).
      config.eventMarkers = {}; 

      //Map from event ids to areas on the map (represented by [Google Maps Polygons](https://developers.google.com/maps/documentation/javascript/reference#Polygon) objects).
      config.eventAreas = {};

      //Map from event ids to multi-point lists/lines (represented by [Google Maps Polylines](https://developers.google.com/maps/documentation/javascript/reference#Polyline) objects). 
      config.eventLists = {}; 

      //Map from spatial names to Google objects. 
      // Used primarily to ensure that map objects are not rendered more than once (for example, if more than one event is associated with a point/line/area). 
      config.poiMapObjects = {};
      
      //Map from event ids to Lat-Longs. 
      config.eventLocations = {}; 

      //Stores which event ID we are currently on. 
      config.atCurrentId = null;

      //Stores the bounding box for the initial map bounds.
      var bounds = new google.maps.LatLngBounds();
      var boundsCount = 0;

      //****************************************************************
      // Immediately-invoked function which creates the map. 
      //****************************************************************
      (function createMap() {
        
        var center; 

        //Retrieve list of locations from the "map" field of the model. 
        var locations = self.model.get("map").poi;
        
        //Find the first point with an existing lat-long value (i.e., does not need to be geocoded) and use that point as the center of the map. 
        for (var i = 0; i < locations.length; i++) {
          var location = locations[i];
          if (location.type == "point") {
            center = new google.maps.LatLng(location.lat, location.lng);
            break;
          }
        }

        var zoom = this.model.get("startingZoomLevel"); 
        
        //Set the map options and create the [Google Map](https://developers.google.com/maps/documentation/javascript/reference#Map) object. 
        var mapOptions = {
          center: center, 
          zoom: zoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        map = new google.maps.Map(self.el, mapOptions);

      }).apply(this);
      //********************* END MAP CREATION *************************


      //****************************************************************
      // Immediately-invoked function for adding event markers to the map. 
      //****************************************************************
      (function addMarkers() {

        //Creates and adds [Google Maps Markers](https://developers.google.com/maps/documentation/javascript/reference#Marker) to the map for point-based events. 
        //Arguments: latlng is the location at which to add the marker, id is the text to place on the marker (matches the id of the corresponding event).
        function drawMarker(latlng, id) {

          //Extend the bounds of the map to ensure that this point is visible.
          bounds.extend(latlng); 
          boundsCount += 1;

          var marker = null;

          marker = new google.maps.Marker({
            position: latlng,
            map: map,
            animation: google.maps.Animation.NONE,
            icon: generateMarkerSVG(id.toString(), "rgb(68,121,186)", "red")
          });

          //Store a reference to this marker object in the eventMarkers array, so the marker can be accessed and updated in response to touches/scrolls.
          config.eventMarkers[id] = marker; 

          //Add an event listener for when this map marker is touched/clicked. 
          google.maps.event.addListener(marker, "click", function() {

            //If there exists a currently-highlighted marker, reset that marker to its default state (i.e., colored blue). 
            if (config.currentMarker != null) {
              var num = config.currentMarker; 
              config.eventMarkers[num].setIcon(generateMarkerSVG(num.toString())); 
            }

            //Set the touched marker's color to red, store it as the current marker, and pan the map to the marker. 
            marker.setIcon(generateMarkerSVG(id.toString(), "red")); 
            config.currentMarker = id; 
            map.panTo(config.eventMarkers[id].getPosition()); 

            //Emit a scroll event to inform the Timeline and Narration Views that the currently-selected event has changed. 
            self.modelView.scrollHasReached(id); 
          });
        }

        //Creates and adds [Google Maps Polylines](https://developers.google.com/maps/documentation/javascript/reference#Polyline) to the map for list-based events (ex: a path or route traveled). 
        //Arguments: coords is an array of [LatLng](https://developers.google.com/maps/documentation/javascript/reference#LatLng) objects, id is the id of the event corresponding to the line(s), scale represents an optional scaling parameter (for thicker or thinner lines). 
        function drawLine(coords, id, scale) {
          var weight = 4; 
          if (scale && !isNaN(parseInt(scale))) {
            weight = 50 - 0.00051136 * (100000 - parseInt(scale)); 
          }

          //Create the symbol that is repeated to form the dotted-line. 
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

          //Store a reference to the line object. 
          config.eventLists[id] = line; 
        }

        //Creates and adds [Google Maps Polygons](https://developers.google.com/maps/documentation/javascript/reference#Polygon) to the map for area-based events. 
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

        //Converts address-based location info into [LatLngs](https://developers.google.com/maps/documentation/javascript/reference#LatLng)
        //using the [Google Maps Geocoder](https://developers.google.com/maps/documentation/javascript/reference#Geocoder). 
        //Because the geocoder request is asynchronous, the user must pass in a callback function to be executed once the request has returned. 
        //This callback function must accept an error string as its first argument, and the result array as its second argument. 
        var geocoder = new google.maps.Geocoder();
        function addressToLatLng(poi, callback) {
          var request = {
            address: poi.value
          }
          geocoder.geocode(request, function(result, status) {
            //If the geocoder request completes successfully, execute callback with the results. 
            if (status == google.maps.GeocoderStatus.OK) {
              callback(null, result);

            //Otherwise, execute the callback with an error message. 
            } else {
              callback("Error", null);
            }
          });
        }

        //Creates a [LatLng](https://developers.google.com/maps/documentation/javascript/reference#LatLng) object for a point-based event, 
        //then passes that LatLng to the drawMarker() function to instantiate it on the map. 
        function createEventPoint(location, id) {
          var latlng;
          
          //If the point is an address, it has to be geocoded with the addressToLatLng() function before the marker can be created. 
          if (location.type == "address") {
            
            (function(location, id) {
              addressToLatLng(location, function(err, result) {
                try {
                  config.eventLocations[id] = result[0].geometry.location;  
                  drawMarker(result[0].geometry.location, id); 
                } catch (err) {
                  console.log("Could not get lat-long from google - possibly over API limit?", err);
                  boundsCount += 1;
                }
              });
            })(location, id);

          //If the point is already in lat-long form, just pull out the respective data fields and create a corresponding [Google Maps LatLng](https://developers.google.com/maps/documentation/javascript/reference#LatLng) object. 
          } else if (location.type == "point") {
          
            latlng = new google.maps.LatLng(location.lat, location.lng); 
            config.eventLocations[id] = latlng; 
            drawMarker(latlng, id); 
          
          }

        } 

        //Creates an array of [LatLng](https://developers.google.com/maps/documentation/javascript/reference#LatLng) coordinates which define the vertices of a polygon. This coordinate array is then passed to the drawArea() function to be instantiated on the map.
        //Currently only supports event areas that are already defined by lat-long-based subpoints, because geocoding all the addresses required to define a complex polygon is not only slow, but also likely to exceed the Google Maps API geocoding limit.
        function createEventArea(area_poi, id) {
          //If an area object already exists with the same name as this one, 
          //then associate the given event id with that same area object (rather than double-creating a new, identical one)/ 
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

        //Creates an array of [LatLng](https://developers.google.com/maps/documentation/javascript/reference#LatLng) coordinates, which defines an ordered list of points to draw lines between. This coordinate array is then passed to the drawLine() function to be instantiated on the map.
        //Makes the simplifying assumption that all coordinates are addresses, or all coordinates are points (no mixing). 
        function createEventList(list, id, scale) {

          var subpoints = list.value; 
          var length = subpoints.length; 

          if (subpoints[0].type == "address") {
            //Assume everything is an address. 

            //Use the async.js library to ensure that all addresses have been geocoded to LatLngs before passing the coordinates array to the drawLine() function. 
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

        //Get all events and map locations from the model. 
        var events = self.model.get("events"); 
        var locations = self.model.get("map").poi; 

        //For each event, cycle through the map locations to find a location with a name that matches the spatial field of the event.
        var numberOfPoints = 0;
        self.model.forAllEvents(function(event) {
          if (event.spatial) {
            var spatial = event.spatial; 
            for (j in locations) {
              if (locations[j].name == spatial) {

                //If the location is a point or an address, create a point for it on the map. 
                if (locations[j].type == "point" || locations[j].type == "address") {
                  numberOfPoints += 1;
                  createEventPoint(locations[j], event.id); 

                //If the location is an area, create a polygon area for it on the map. 
                } else if (locations[j].type == "area") {
                  createEventArea(locations[j], event.id); 

                //If the location is a list of points, create a list of coordinates and draw connecting lines between them on the map. 
                } else if (locations[j].type == "list") {
                  createEventList(locations[j], event.id, event.participants[0]); 
                }
              }
            }
          }

        });

        //Spinlock: wait to fit the bounds of the map until all the markers have been added to the bounds object.
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


    //Renders the map in response to received scroll events. 
    //Takes in the ID of the event which has just been scrolled to. 
    renderScrolled: function(intID) {
      var config = this.config;

      //Coerce ID to string
      var id = intID.toString(); 

      //If the ID of the currently-selected event matches the ID of the scrolled-to event, we're already where we need to be, and can return without taking action. 
      if (config.atCurrentId === id) {
        return;
      }
      config.atCurrentId = id;

      //Reset the old highlighted marker back to its original state (i.e., the default light blue color)
      if (config.currentMarker != null) {
        var curr = config.currentMarker; 

        //If the old marker was a point marker.
        if (config.eventMarkers[curr] != null) {
          var icon = generateMarkerSVG(curr.toString())
          config.eventMarkers[curr].setIcon(icon); 

        //If the old marker was an area / polygon. 
        } else if (config.eventAreas[curr] != null) {

          var options = {
            strokeColor: "#4479BA",
            fillColor: "#4479BA"
          }; 
          config.eventAreas[curr].setOptions(options); 

        //If the old marker was a list / line. 
        } else if (config.eventLists[curr] != null) {
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

      //Sets the color of the newly-selected marker (the one that has just been scrolled to) to be highlighted in red,
      //and stores it as the currently-selected marker. 

      //If the newly-selected marker is a point.
      if (config.eventMarkers[id] != null) {

        icon = generateMarkerSVG(id.toString(), "red"); 
        config.eventMarkers[id].setIcon(icon); 
        config.currentMarker = id; 
        map.panTo(config.eventMarkers[id].getPosition()); 

      //If the newly-selected marker is an area / polygon.
      } else if (config.eventAreas[id] != null) {

        var options = {
          strokeColor: "#FF0000",
          fillColor: "#FF0000"
        }; 
        config.eventAreas[id].setOptions(options); 
        config.currentMarker = id; 
        map.panTo(config.eventAreas[id].getPath().getAt(0)); 

      //If the newly-selected marker is a list / line.
      } else if (config.eventLists[id] != null) {

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
  // Here we generate SVG markers for the map on the client side.
  // We hash them to a data-uri, which is cached using memoization hashes. 
  //****************************************
  

  var svgText = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
  svgText += '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="30" height="38">'
  svgText += '  <polygon points="0,0 0,32 12,32 15,38 18,32 30,32 30,0" style="fill:<%COLOR%>;stroke-width:0.5;stroke:black;stroke-location:inside;"/>'
  svgText += '  <text style="font-family:museo,Helvetica; font-weight:100; text-anchor:middle; font-size: 10pt; baseline-shift:-33%;" x="15" y="16" fill="white"><%TEXT%></text>'
  svgText += '</svg>'

  var memoizeSVG = {};
  window.memoizeSVG = memoizeSVG;

  //Generates an SVG marker based on the given text, color, and alternate color (which determines the color the marker switches to when it has been selected/scrolled to). 
  function generateMarkerSVG(text, color, alt_color) {
    var color = color || "rgb(68,121,186)"; 
    var alt_color = alt_color || "red";
    var text = text || "-"; 

    var hash = color + "--HASH--" + text;
    var alt_hash = alt_color + "--HASH--" + text;
    if (memoizeSVG[hash]) {
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

// ## Next see [MapView.js](MapView.js.html), [TimelineView.js](TimelineView.js.html) or [NarrationView.js](NarrationView.js.html). Or you're done!
