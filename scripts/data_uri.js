var express = require('express'),
    request = require('request'),
    sys = require('sys');
 
var app = express();
app.use(express.logger());
app.use(express.bodyParser());
 
app.get('/', function(req, res){
  if(req.param("url")) {
    var url = unescape(req.param("url"));
    console.log("Incoming stuff:", url)

    request({uri:url}, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var data_uri_prefix = "data:" + response.headers["content-type"] + ";base64,";
        var image = new Buffer(body.toString(), 'binary').toString('base64');                                                                                                                                                                 
        image = data_uri_prefix + image;
        res.send('<img src="'+image+'"/>');
      }
    }); 
  }
});
 
app.listen(3010);