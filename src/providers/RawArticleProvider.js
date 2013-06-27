var fs   = require('fs');
var path = require('path');

/*
 * This module parses a directory full of raw .json files
 * into a list of articles
 */

function RawArticleProvider() {
  this.articles = [];
};

/*
 * Find an article by its id in the array
 */
RawArticleProvider.prototype.findById = function(id, callback) {
  if (id < this.articles.length) {
    callback(null, this.articles[id]);
  } else {
    callback(new Error("id out of range"), null);
  }
}

/*
 * Find an article by its title
 */
RawArticleProvider.prototype.findByTitle = function(title, callback) {
  var result = null;
  for (var i = 0; i < this.articles.length; i++) {
    if (articles[i].title == title) {
      result = articles[i];
      break;
    }
  }
  if (result) {
    callback(null,result);
  } else {
    callback(new Error("Could not find article with title '" + title + "'"), null);
  }
}

/*
 * Get all the titles in this ArticleProvider
 */
RawArticleProvider.prototype.getTitles = function(callback) {
  var result = [];
  for (var i = 0; i < this.articles.length; i++) {
    result.push({id:i, title:this.articles[i].title});
  }
  callback(null, result);
}

/*
 * This loads a directory full of json files,
 * discarding those that doesn't conform to our format,
 * and filling in details as necessary.
 *
 * Potential Issues: If files are busy loading when a request gets made, 
 * only those loaded so far will be returned. Possibly notify the user?
 */
RawArticleProvider.prototype.loadDir = function(dirname) {
  console.log("Loading articles from", dirname);

  function loadFile(err,data) {
    //Here we parse the json
  }

  fs.readdir(dirname, function(err, files) {

    for (i in files) {
      if (path.extname(files[i]) == '.json') {
        fs.readFile(path.join(dirname, files[i]), loadFile);
      }
    }

  });
} 

module.exports = RawArticleProvider;