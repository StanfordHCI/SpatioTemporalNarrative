var im = require("imagemagick"); 
var mkdirp = require("mkdirp"); 
var path = require("path"); 
var fs = require("fs"); 

// express/connect middleware entrypoint
// Example: app.use("/marker", MarkerMagick.static(__dirname + '/public/marker-cache')); 
exports .static = function(root, options) {

	var root = path.normalize(root); 

	// text, color, dimensions
	return function(req, res, next) {
		var color = req.query.color; 
		var text = req.query.text; 
		var dim = req.query.dim; 
		res.json({
			"color": color, 
			"text": text, 
			"dim": dim
		}); 
	}
}