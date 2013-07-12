Models = (function() {

  function ArticleModel(options) {
    this.options = options || {};
    this.data = [];
  };

  _.extend(ArticleModel.prototype, Backbone.Events, {

    // This returns data from our internal store.
    get: function(key) {
      return this.data[key];
    },

    // This updates our internal store, and triggers a "change" event.
    set: function(key) {
      this.data[key];
      this.trigger('change:'+key);
    },

    // This initializes our internal store.
    fetchById: function(id) {

      var self = this;
      $.ajax("/articles/" + id, {

        success: function(data) {

          self.data = data;
          self.trigger('change', self);

        }

      });

    },

    // This is an iterator function that calls the passed in function
    // funce for every event on every event (includiding subevents) 
    // in the current model.

    forAllEvents: function(func) {
      
      var events = this.data.events;

      // This function calls the func on all events. If an event has
      // subevents, this function recursively calls itself to call
      // func on all those subevents as well
      function callOnMeAndMyChildren(evt) {
        func(evt);
        if (evt.events)
          for (var i = 0; i < evt.events.length; i++) {
            callOnMeAndMyChildren(evt.events[i]);
          }
      }      
      for (var i = 0; i < events.length; i++) {
        callOnMeAndMyChildren(events[i]);
      }

    },

    // Returns an event or subevent based on its unique id. IDs 
    // are in the represented by numbers where each subevent id 
    // is the combination of its parent events' id and its own index, 
    // seperated by a "." (for example 1.2 is a subevent ID)
    getEventById: function(id) {
      if (typeof id == 'number') {
        return this.data.events[id];
      }
      idList = id.split(".");
      var evt = this.data.events[idList[0]];
      for (var i = 1; i < idList.length; i++) {
        evt = evt.events[idList[i]];
      }
      return evt;
    },

    // If the event corresponding to the passed in ID is a nested one,
    // return its parent event. Otherwise, return undefined.
    getEventParent: function(id) {
      if (typeof id != 'number'){
        var splits = id.split(".");
        if (splits.length > 1) {
          splits.splice(-1,1);
          return this.getEventById(splits.join("."));
        }
      }
      return undefined;
    }

  })

  // This initializes the ArticleIndexModel based on the passed in options
  function ArticleIndexModel(options) {
    this.options = options || {};
    this.data = [];
  }

  _.extend(ArticleIndexModel.prototype, Backbone.Events, {

    // This function returns the ArticleIndexModel
    get: function() {
      return this.data;
    },

    fetch: function() {

      var self = this;
      $.ajax("/articles/", {

        success: function(data) {

          self.data = data;
          self.trigger('change', self);

        }

      })

    }

  })


  return {
    ArticleModel: ArticleModel,
    ArticleIndexModel: ArticleIndexModel
  }


})();