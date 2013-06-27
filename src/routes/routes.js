var RawArticleProvider = require('./../providers/RawArticleProvider.js');

var articleProvider = new RawArticleProvider();

var list_articles = function(req, res) {
  res.json({name:"huh"});
  
};

var get_article = function(req, res) {
  res.json({name:req.params.id});
}

/*
 * ENTRYPOINT: Configure the routes:
 */
exports.init = function(app) {

  //Load up articles
  articleProvider.loadDir(app.get('articleDir'));

  app.get('/articles',    list_articles);
  app.get('/articles/:id', get_article);

  
}
