//
// # Server Entrypoint
// 
// This file defines the back-end node.js server.
// Running 'npm start' from the command line opens this file in node.


// ### 1. Dependencies
// 
// Our back-end is built on top of [express.js](http://expressjs.com/).
// Express is built on top of the excellent [connect.js]() server middleware package, from which
// Express inherits its stack-based server infrastructure.
var http = require('http');
var path = require('path');
var express = require('express');

//The QuickThumb module can resize images on the server before sending it to the client.
var quickThumb = require('./../lib/quickthumb.js');

//The MarkerMagic module takes a color and string and generates custom .png markers for Google Maps.
var markerMagick = require('./../lib/MarkerMagick.js'); 

//Our app's router provides the multiple server endpoints for our app
var routes = require('./routes/routes');

// ### 2. Configure the Express HTTP server.
var app = express();

// Here we see the stack design of express.js servers in action. 
// When a request comes into the server, it moves through a stack of handlers. 
// Every handler has an opportunity to modify the request and response object, write data or finish the response, or punt and pass it to the next handler.
// This means the order of these handlers are important!
// This achieves strong modularity of server components.
// We build up a stack of handlers using the `app.use()` method.
//
// See [connect.js API](http://www.senchalabs.org/connect/) and [express.js API](http://expressjs.com/api.html), all the middleware of that is available.
app.configure(function() {

  app.set('port', process.env.PORT || 3000);
  app.set('articleDir', path.join(__dirname, '..', 'data'));
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());

  //This enables the default express.js router, which we initialize further down
  app.use(app.router);
  
  //We use LESS.css as a CSS preprocessor, this middleware automatically compiles LESS into CSS on demand
  app.use(require('less-middleware')({ src: __dirname + '/public' }));

  //The QuickThumb module provides resizing of images on demand, 
  //this helps with memory usage on mobile devices by allowing them to request custom-sized images
  app.use('/content', quickThumb.static(__dirname + '/public/content'))

  app.use("/marker", markerMagick.static(__dirname + '/public/marker-cache')); 

  //Serves up static files on disk.
  app.use(express.static(path.join(__dirname, 'public')));

  //
  app.use(express.directory(path.join(__dirname, 'public')));

  // The very last layer catches any errors and renders it to the web. 
  app.use(express.errorHandler());    

});

// This `.init()` call gives our app the opportunity to build routes, as defined in [src/routes/routes.js](routes/routes.js.html)
routes.init(app);


//Create the HTTP server we defined.
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// # See [src/routes/routes.js](routes/routes.js.html) Next
