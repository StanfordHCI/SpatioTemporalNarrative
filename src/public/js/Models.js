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