var im = require("imagemagick"); 
var mkdirp = require("mkdirp"); 
var path = require("path"); 
var fs = require("fs"); 

var markerMagick = {};

module.exports = markerMagick;

// express/connect middleware entrypoint
// Example: app.use("/marker", MarkerMagick.static(__dirname + '/public/marker-cache')); 
markerMagick.static = function(root, options) {

	var root = path.normalize(root); 

	function send_if_exists(file, req,res, callback){
		fs.exists(file, function(exists){
			if (!exists){
				return callback();
			}

			fs.stat(file, function(err, stats){
				if (err){
					console.error(err);
				}
				else if (stats.isFile()){
					return res.sendfile(file);
				}
				callback();
			});
		});
	}

	// text, color, dimensions
	return function(req, res, next) {
		var color = req.query.color || "white"; 
		var text = req.query.text || "-"; 
		var dim = req.query.dim || "100x100"; 

		var cacheFile = path.join(root, ".cache", "result_" + color + text + dim + ".png");

		mkdirp(path.dirname(cacheFile));

		send_if_exists(cacheFile, req, res, function() {
			markerMagick.createMarker(color, text, dim, cacheFile, function(err, file) {
				if (err) {
					next(err); 
				} else {
					res.sendfile(file); 
				}
			}); 
		});

	}
}

// %23 4479ba

markerMagick.createMarker = function(color, text, dim, cacheFile, callback) {
	try {
		im.convert(
			[path.join(__dirname, "map-marker-hi.png"), "-fuzz", "20%", "-fill", color, "-opaque", "rgb(255, 107, 0)", "-fill", "white", "-pointsize", "172", "-annotate", "+75+225", text, "-resize", dim, cacheFile], function(err, stdout, stderr) {
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