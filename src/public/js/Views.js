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
    
    //Initializes the view by binding change events from the model to the render function
    initialize: function() {
      this.listenTo(this.model, "change", _.bind(this.render, this)); 
    }, 

    //Draws the view into the element.
    render: function() {
      this.el.html(this.template(this.model.get()));
      return this;
    }, 
    
    clear: function() {
      this.el.html("");
      return this;
    },

    //This checks that we were handed an element to render to.
    _ensureElement: function() {
      if (!this.el) {
        throw new Error("View requires a container element");
      }
    },

    //This sets up all the event listeners, only runs on initialization.
    //It uses event delegation, so listeners only occur
    //on the element of this entire View, not any subelements.
    //This means that we do not have to rebind events on every render
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

    //This stores the template HTML to render for the view
    template: _.template("<ul><% _.each(articles, function(article){ %> <li articleId=<%= article.id %>> <%= article.title %> </li> <% }) %> </ul>")
  });

  return {
    ArticleIndexView: ArticleIndexView
  }

})();