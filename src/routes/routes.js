// Routes provides the endpoints for our serverside.
// That is, it defines URLs that, when called on this server,
// will run custom code of our own.
// We use this for one purpose - to serve up JSON data about different stories to the client app.


//Include our datasource, which loads up stories from disk, parses them, and provides database-like functions
//to access them
var RawArticleProvider = require('./../providers/RawArticleProvider.js');
var articleProvider = new RawArticleProvider();

// This function handles any `/articles` request to give a list of available articles.
// It does this by calling the datastore, and provides a callback function that renders the titles as json for the client
var list_articles = function(req, res, next) {
  articleProvider.getTitles(function(err,data) {
    res.json(data);    
  });
};

// This function handles any `/articles/:id` request to give all the data for a specific article.
// If no article is found, it passes an error onto the next handler by calling `next()`
var get_article = function(req, res, next) {
  var id = parseInt(req.params.id);
  if (isNaN(id)) {
  
    next(new Error("ID is incorrect format"));
  
  } else {

    articleProvider.findById(req.params.id, function(err,data) {
      if (err) {
        next(err);
      } else {
        res.json(data);
      }
    });
  
  }
}


//
// ### ENTRYPOINT
//
// `.init(app)` is exposed as this module's only public function, 
// 
exports.init = function(app) {

  //Load up articles
  articleProvider.loadDir(app.get('articleDir'));

  app.get('/articles',    list_articles);
  app.get('/articles/:id', get_article);
  
}

// # See [src/providers/RawArticleProvider.js](../providers/RawArticleProvider.js.html) Next