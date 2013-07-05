
/**
 * Module dependencies.
 */

var http = require('http');
var path = require('path');
var express = require('express');
var quickThumb = require('./../lib/quickthumb.js');

var routes = require('./routes/routes');

var app = express();

// all environments
// See connect.js and express.js, all the middleware of that is available:
// http://www.senchalabs.org/connect/
// http://expressjs.com/api.html

app.configure(function() {

  app.set('port', process.env.PORT || 3000);
  app.set('articleDir', path.join(__dirname, '..', 'data'));
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use('/content', quickThumb.static(__dirname + '/public/content'))
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.directory(path.join(__dirname, 'public')));

  app.use(express.errorHandler());
  // development only
  if ('development' == app.get('env')) {
    
  }

});


//Set up routes:

routes.init(app);


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
