
/*
 * Initialization of the entire app.
 * This is loaded from client.js, which handles all the loading,
 * and runs when all the DOM is loaded.
 */

$(document).ready(function(event) {

  Events.Global.on("all", function(name, args) {
    console.log("Event Fired: ", name);
  });


  //*****************************************************
  // Setting up the index models and views
  //*****************************************************


  var articleIndexModel = new Models.ArticleIndexModel();

  var articleIndexView = new ArticleIndexView({ 
    el: $("#index_container"), 
    model: articleIndexModel,
  });

  articleIndexView.on("navigate:article", function(id) {
    router.navigate("article/"+id, { trigger:true });
  });


  //*****************************************************
  // Setting up the article models and views
  //*****************************************************

  var articleModel = new Models.ArticleModel();

  var articleViewModel = new ArticleViewModel({
    model: articleModel,
    el: $("#article_container")
  });

  articleViewModel.on("navigate:index", function() {
    router.navigate("/", { trigger:true });
  });

  window.articleModel = articleModel;
  window.articleViewModel = articleViewModel; 
  
  //We are focusing on using events, including for initialization.
  //That way we simply bind responders to the initialization event.
  var AppRouter = Backbone.Router.extend({

    routes: {
      "article/:id": "article",
      "*default": "index",
    },

    index: function() {
      //Get the data for this model.
      //That starts off the entire process to build the interface.
      articleIndexModel.fetch();

      //Hide the rest of the UI
      articleViewModel.hide();
    },

    article: function(id) {
      //Get the data for this model.
      //That starts off the entire process to build the interface.
      articleModel.fetchById(id);

      //Hide the rest of the UI
      articleIndexView.clear();
    },

  });

  var router = new AppRouter();
  Backbone.history.start();

  window.router = router;


});