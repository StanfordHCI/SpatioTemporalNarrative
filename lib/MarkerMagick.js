var im = require("imagemagick"); 
var mkdirp = require("mkdirp"); 
var path = require("path"); 
var fs = require("fs"); 

// express/connect middleware entrypoint
// Example: app.use("/marker", MarkerMagick.static(__dirname + '/public/marker-cache')); 
exports.static = function(root, options) {

	var root = path.normalize(root); 

	// text, color, dimensions
	return function(req, res, next) {
		var color = req.query.color || "white"; 
		var text = req.query.text || "-"; 
		var dim = req.query.dim || "100x100"; 

		exports.createMarker(color, text, dim, function(err, file) {
			if (err) {
				next(err); 
			} else {
				res.sendfile(file); 
			}
		}); 
	}
}

// %23 4479ba

exports.createMarker = function(color, text, dim, callback) {
	try {
		im.convert([path.join(__dirname, "map-marker-hi.png"), "-fuzz", "20%", "-fill", color, "-opaque", "rgb(255, 107, 0)", "-fill", "white", "-pointsize", "172", "-annotate", "+75+225", text, "-resize", dim, path.join(__dirname, "result.png")], function(err, stdout, stderr) {
			if (err) {
				callback(err, undefined); 
			} else {
				callback(null, path.join(__dirname, "result.png")); 
			}
		}); 
	} catch(error) {
		callback(error, null); 
	}
}