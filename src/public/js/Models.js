Models = (function() {

  function ArticleModel(options) {
    this.options = options || {};
    this.data = [];
  };

  _.extend(ArticleModel.prototype, Backbone.Events, {

    //This returns data from our internal store.
    get: function(key) {
      return this.data[key];
    },

    //This updates our internal store, and triggers a "change" event
    set: function(key) {
      this.data[key];
      this.trigger('change:'+key);
    },

    //This initializes our internal store
    fetchById: function(id) {

      var self = this;
      $.ajax("/articles/" + id, {

        //what about fails? timeouts? check data?

        success: function(data) {

          self.data = data;
          self.trigger('change', self);

        }

      });

    },

    forAllEvents: function(func) {
      //Call func for every event with func(event);
      
      var events = this.data.events;

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

    //Return an event or subevent based on its unique id
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

    //If id is a nested event, get its parent
    getEventParent: function(id) {
      var splits = id.split(".");
      if (splits.length > 1) {
        splits.splice(-1,1);
        return this.getEventById(splits.join("."));
      }
      return undefined;
    }

  })

  function ArticleIndexModel(options) {
    this.options = options || {};
    this.data = [];
  }

  _.extend(ArticleIndexModel.prototype, Backbone.Events, {

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