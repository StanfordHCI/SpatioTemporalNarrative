//This provides a list of article names that the user can touch,
//and gets taken to the display of that article.
//Wrap the entire function in an immediately executed anonymous function to hide the internal details.
ArticleIndexView = (function() {


  //The constructor function for the ArticleIndexView sets up everything,
  //but doesn't yet draw anything to screen. 
  //We use **data binding** to connect the view to the model, 
  //so drawing only happens once
  //an event is received from the model.
  function ArticleIndexView(options) {
    this.options = options || {}; 
    this.model = options.model || undefined;
    this.el = options.el; 
    this._ensureElement(); 
    this.initialize(); 
    this._delegateEvents();
  }

  //We make the view extend Backbone's Events system, so we can use the **observer** pattern.
  _.extend(ArticleIndexView.prototype, Backbone.Events, {
    
    //Initializes the view by binding change events from the model to the render function.
    //This is how we implement **data binding**
    initialize: function() {
      this.listenTo(this.model, "change", _.bind(this.render, this)); 
    }, 

    //This checks that we were handed an element to render to.
    _ensureElement: function() {
      if (!this.el) {
        throw new Error("View requires a container element");
      }
    },

    //Draws the view into the element.
    //We use [underscore.js's very simple template system](http://underscorejs.org/#template) to do this.
    //The template function itself is defined further down.
    render: function() {
      this.el.html(this.template(this.model.get()));
      return this;
    }, 
    
    clear: function() {
      this.el.html("");
      return this;
    },

    //This sets up all the event listeners, only runs on initialization.
    //It uses event delegation, so listeners only occur
    //on the element of this entire View, not any subelements.
    //This means that we do not have to rebind events on every render
    _delegateEvents: function() {

      var isTouch = "ontouchstart" in window;

      var self = this;
      
      //Triggers events on this object itself, so the app can listen for navigation events from the index view.
      this.el.on(isTouch ? 'touchend' : 'mouseup', 'li', function(evt) {
        var id = this.getAttribute('articleId');
        self.trigger("navigate:article", id);
      });

      //Sets the 'hover' class in CSS whenever the person touches a link to create a nice visual effect.
      this.el.on(isTouch ? 'touchstart touchend' : 'mouseover mouseout', 'li', function(evt) {
        $(this).toggleClass('hover');
      });

    },

    //This stores the template HTML to render for the view
    //See the index.html file to see what the template looks like - it is an HTML snippet
    //that draws a list element with entries for every article name, styles by our CSS to look like buttons.
    template: _.template(document.getElementById('tmpl-articlelist').innerHTML)
    
  });

  return ArticleIndexView;

})();

// # See [ArticleViewModel.js](ArticleViewModel.js.html) Next

