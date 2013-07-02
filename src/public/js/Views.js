Views = (function() {


  function ArticleIndexView(options) {
    this.options = options || {}; 
    this.model = options.model || undefined;
    this.el = options.el; 
    this._ensureElement(); 
    this.initialize(); 
    this._delegateEvents();
  }

  _.extend(ArticleIndexView.prototype, Backbone.Events, {
    
    initialize: function() {
      this.listenTo(this.model, "change", _.bind(this.render, this)); 
    }, 

    render: function() {
      this.el.html(this.template(this.model.get()));
    }, 
    
    clear: function() {
      this.el.html("");
    },

    _ensureElement: function() {
      if (!this.el) {
        throw new Error("View requires a container element");
      }
    },

    _delegateEvents: function() {

      var self = this;
      
      this.el.on("click", "li", function(evt) {
        var id = this.getAttribute("articleId");
        self.trigger("navigate:article", id);
      });

      this.el.on("mouseover mouseout", "li", function(evt) {
        $(this).toggleClass("hover")
      });

    },

    template: _.template("<ul><% _.each(articles, function(article){ %> <li articleId=<%= article.id %>> <%= article.title %> </li> <% }) %> </ul>")
  });

  return {
    ArticleIndexView: ArticleIndexView
  }

})();