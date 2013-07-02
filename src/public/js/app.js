
/*
 * Initialization of the entire app.
 * This is loaded from client.js, which handles all the loading,
 * and runs when all the DOM is loaded.
 */

$(document).ready(function(event) {

  Events.Global.on("all", function(name, args) {
    console.log("Event Fired: ", name);
  });




  var articleIndexModel = new Models.ArticleIndexModel();
  var articleIndexView = new Views.ArticleIndexView({ 
    el: $("#index_container"), 
    model: articleIndexModel,
  });

  articleIndexView.on("navigate:article", function(id) {
    router.navigate("article/"+id, { trigger:true });
  });



  //We are focusing on using events, including for initialization.
  //That way we simply bind responders to the initialization event.
  var AppRouter = Backbone.Router.extend({

    routes: {
      "article/:id": "article",
      "*default": "index",

    },

    index: function() {

      articleIndexModel.fetch();

    },

    article: function(id) {

      console.log("ARTICLE")

      var articleModel = new Models.ArticleModel();
      
      articleModel.fetchById(id);
      window.articleModel = articleModel;

      // //Internally it registers to the Model's init event
      // var globalState = GlobalState.initialize(articleModel);

      // //Internally registers to the appropriate 
      // var narrativeView = new NarrativeView(globalState);
      // var mapView = new MapView(globalState);
      // var timelineView = new TimelineView(globalState);

      // iPadScroller.disableDefaultScrolling();
      // iPadScroller.createScroller(
      //   document, 
      //   document.getElementById("narrative_container"),
      //   _.bind(narrativeView.scrollDelegate, narrativeView));

    },

  });

  var router = new AppRouter();
  Backbone.history.start();

  router.on("route", function(name) {
    if (name != "index")
      articleIndexView.clear();
  });


  window.router = router;


});