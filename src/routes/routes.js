var RawArticleProvider = require('./../providers/RawArticleProvider.js');

var articleProvider = new RawArticleProvider();

var list_articles = function(req, res, next) {
  articleProvider.getTitles(function(err,data) {
    res.json(data);    
  });
};

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


var svgText = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'


svgText += '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="40" height="42">'
svgText += '<g>'
svgText += '  <rect width="100%" height="100%" style="font-family:museo; fill:<%COLOR%>;stroke-width:0"/>'
svgText += '  <text style="text-anchor:middle; baseline-shift:-33%;" x="50%" y="50%" fill="white"><%TEXT%></text>'
svgText += '</g>'
svgText += '</svg>'

var svgmarker = function(req, res, next) {

    var color = req.query.color || "rgb(68,121,186)"; 
    var text = req.query.text || "-"; 
    var dim = req.query.dim || "40x40"; 

    var newText = svgText.replace("<%TEXT%>", text).replace("<%COLOR%>", color);


    res.setHeader("Content-Type", "image/svg+xml");
    res.end(newText);

}

/*
 * ENTRYPOINT: Configure the routes:
 */
exports.init = function(app) {

  //Load up articles
  articleProvider.loadDir(app.get('articleDir'));

  app.get('/articles',    list_articles);
  app.get('/articles/:id', get_article);

  app.get('/svgmarker', svgmarker);


  
}
