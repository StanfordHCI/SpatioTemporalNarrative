
// ## App Design
// We follow a variant of the Model-View-ViewModel pattern:
// 
// - Our client-side router either requests loading the list of articles, or loading a specific article.
// - Our model retrieves articles from the server, and emits **events** when a request is completed.
// - Our views use the **data binding** pattern by listening to these events and updating themselves as necessary.
// 
// Initialization of the entire app happens here.
// This is loaded from client.js, which handles all the loading,
// and runs when all the DOM is loaded.
//
// We are focusing on using events, including for initialization.

$(document).ready(function(event) {

  // ### Setting up the index models and views
  //**************************************************
  
  //The ArticleIndexModel contains the list of articles on the server.
  var articleIndexModel = new Models.ArticleIndexModel();

  //The IndexView shows just the list as clickable article names to the user.
  //It binds itself to the given model, and will update when data comes in.
  var articleIndexView = new ArticleIndexView({ 
    el: $("#index_container"), 
    model: articleIndexModel,
  });

  //We use the **observer** pattern to listen for events coming from the articleIndexView when it wants to navigate to an article
  articleIndexView.on("navigate:article", function(id) {
    router.navigate("article/"+id, { trigger:true });
  });

  // ### Setting up the article models and views
  //**************************************************

  //The ArticleModel stores the data for a single story.
  var articleModel = new Models.ArticleModel();

  //The ArticleViewModel has two pruposes:
  //
  // - **Container** for the three subviews that make up an article
  // - **Event Aggregator** for the three subviews to communicate in a decoupled manner.
  var articleViewModel = new ArticleViewModel({
    model: articleModel,
    el: $("#article_container")
  });

  //Use the **observer** pattern to listen for navigation requests from the ViewModel.
  articleViewModel.on("navigate:index", function() {
    router.navigate("/", { trigger:true });
  });

  
  //Here we configure out two routes: either displaying an index or displaying an article's three subviews using the ViewModel.
  var AppRouter = Backbone.Router.extend({

    routes: {
      "article/:id": "article",
      "*default": "index",
    },

    index: function() {
      //Request the data for the index view.
      //That starts off the entire process to build the interface and make it visible.
      articleIndexModel.fetch();

      //Hide the rest of the UI
      articleViewModel.hide();
    },

    article: function(id) {
      //Request the data for the specific id's article view.
      //That starts off the entire process to build the interface and make it visible.
      articleModel.fetchById(id);

      //Hide the rest of the UI
      articleIndexView.clear();
    },

  });

  var router = new AppRouter();
  Backbone.history.start();

});

// ## Next see [Models.js](Models.js.html)