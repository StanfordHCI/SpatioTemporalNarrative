// RawArticleProvider provides a database-like interface 
// to the set of JSON files representing stories on disk.
// It loads all .json files found in the `/data` directory, 
// parses and checks them for consistency, and stores them in memory.
// Three public methods provide access to the rest of the app: 
//
//  - `findById()` 
//  - `findByTitle()`
//  -  `getTitles()`
//
// They are all callback-based functions.

var fs   = require('fs');
var path = require('path');


// ### RawArticleProvider constructor
function RawArticleProvider() {
  this.articles = [];
};


// Public method to find an article by its id in the array
RawArticleProvider.prototype.findById = function(id, callback) {
  if (id < this.articles.length) {
    callback(null, this.articles[id]);
  } else {
    callback(new Error("id out of range"), null);
  }
}


// Public method to find an article by its title
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


// Public method to get a list of all the titles in this ArticleProvider
RawArticleProvider.prototype.getTitles = function(callback) {
  var result = [];
  for (var i = 0; i < this.articles.length; i++) {
    result.push({id:i, title:this.articles[i].title});
  }
  callback(null, {"articles":result});
}

// Helper function to mutate an array by removing any repeating values.
var removeRepeats = function(arr) {
  arr.sort();
  var prev = this[0];
  var i = 1;
  while (arr[i]) {
    if (arr[i] == arr[i - 1]) {
      arr.splice(i, 1);
    } else {
      i++;
    }
  }
}

//
// This loads a directory full of json files,
// discarding those that doesn't conform to our format,
// and filling in details as necessary.
//
// Potential Issues: If files are busy loading when a request gets made, 
// only those loaded so far will be returned. Possibly notify the user?
//
RawArticleProvider.prototype.loadDir = function(dirname) {
  console.log("Loading articles from", dirname);

  //Save a reference to the current object in the closure of any helper functions
  var self = this;

  //`loadFile()` is asynchronously called for every JSON file in the `/data` directory.
  function loadFile(err,data) {
    
    if (err) {
      console.log("Error Loading File");
      console.log(data);
    } else {
      
      //First we parse the JSON data from the file into a javascript object.
      var file = JSON.parse(data);

      //We recursively generate IDs for all the events of the form "x.x.x" where each subevent gets a new .x appended.
      (function generateTreeIds() {
        
        var stack = [];
        for (var i = 0; i < file.events.length; i++) {
          stack.push({id: i, evt: file.events[i], depth: 0});
        }

        var ev;
        while (ev = stack.pop()) {
          ev.evt.id = ev.id;
          ev.evt.depth = ev.depth;
          if (ev.evt.events) {
            for (var i = 0; i < ev.evt.events.length; i++) {
              stack.push({id: ev.evt.id + "." + i, evt: ev.evt.events[i], depth: ev.depth+1});
            }          
          }
        }

      })();

      //Checks to see if the file is an narrative file and has all the appropriate fields.
      //If not, punt on this file completely.
      if (file.title != null && file.map != null && file.events != null && file.participants != null) {

        //This helper object converts an array of time strings into an array of date objects.
        var convertToDate = function(timeArr) {
          if (timeArr) {
            var dateObjs = [];
            for(var t = 0; t < timeArr.length; t++) {
              dateObjs.push(new Date(timeArr[t]));
            }
            return dateObjs;
          }
        }


        //We check every event for its subevents,
        //and fill out the participants field of an event 
        //as the union of its subevents' participants.
        for (var i = 0; i < file.events.length; i++) {
          if (file.events[i].events) {

            var subevents = file.events[i].events;

            if (!file.events[i].participants) {
              file.events[i].participants = [];
              for (var j = 0; j < file.events[i].events.length; j++) {
                if (file.events[i].events[j].participants){
                  file.events[i].participants = file.events[i].participants.concat(file.events[i].events[j].participants);
                }
              }
              removeRepeats(file.events[i].participants);
            }

            //We convert time strings into Date objects
            for (var j = 0; j < subevents.length; j++) {
              if (subevents[j].time) {
                file.events[i].events[j].time = convertToDate(subevents[j].time);
              }
            } 
          }

          //If an event does not have a time associated with it,
          //we create a time range as an array of its first and last subevent's times.
          if (!file.events[i].time && file.events[i].events) {
              var subevents = file.events[i].events
              file.events[i].time = [];
              file.events[i].time.push(subevents[0].time[0]);
              var last_subevent = subevents[subevents.length - 1];
              file.events[i].time.push(last_subevent.time[last_subevent.time.length -1]);
            } else {
              file.events[i].time = convertToDate(file.events[i].time);
            }
        }
      }

      //Lastly, we save the article into the RawArticleProvider's internal store.
      self.articles.push(file);
    }
    
  }
  

  //This is the actual entrypoint for loading a directory of files.
  //We iterate over the entire list of files, checking for .json extentions, 
  //and calling `fs.readfile()` with our `loadFile()` function as its callback.
  fs.readdir(dirname, function(err, files) {

    for (i in files) {
      if (path.extname(files[i]) == '.json') {
        console.log(files[i]);
        fs.readFile(path.join(dirname, files[i]), loadFile);
      }
    }

  });
} 

//Finally, define this module's publicly available object as the RawArticleProvider constructor.
module.exports = RawArticleProvider;

// # That's it for the serverside! See [src/public/js/client.js](../public/js/client.js.html) next.