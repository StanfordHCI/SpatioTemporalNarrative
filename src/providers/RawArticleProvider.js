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
  callback(null, {"articles":result});
}

Array.prototype.removeRepeats = function() {
  this.sort();
  var prev = this[0];
  var i = 1;
  while (this[i]) {
    if (this[i] == this[i - 1]) {
      this.splice(i, 1);
    } else {
      i++;
    }
  }
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

  var self = this;

  function loadFile(err,data) {
    //Here we parse the json
    if (err) {
      console.log("Error Loading File");
      console.log(data);
    } else {
      var file = JSON.parse(data);

      (function generateTreeIds() {
        
        var stack = [];
        for (var i = 0; i < file.events.length; i++) {
          stack.push({id: i, evt: file.events[i]});
        }

        var ev;
        while (ev = stack.pop()) {
          ev.evt.id = ev.id;
          if (ev.evt.events) {
            for (var i = 0; i < ev.evt.events.length; i++) {
              stack.push({id: ev.evt.id + "." + i, evt: ev.evt.events[i]});
            }          
          }
        }

      })();


      //checks to see if the file is an narrative file
      if (file.title != null && file.map != null && file.events != null && file.participants != null) {

        var convertToDate = function(timeArr) {
          if (timeArr) {
            var dateObjs = [];
            for(var t = 0; t < timeArr.length; t++) {
              dateObjs.push(new Date(timeArr[t]));
            }
            return dateObjs;
          }
        }


        //*
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
              file.events[i].participants.removeRepeats();
            }

            for (var j = 0; j < subevents.length; j++) {
              if (subevents[j].time) {
                file.events[i].events[j].time = convertToDate(subevents[j].time);

                
              }
            } 
          }

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

      self.articles.push(file);
    }
    
  }
  

  fs.readdir(dirname, function(err, files) {

    for (i in files) {
      if (path.extname(files[i]) == '.json') {
        console.log(files[i]);
        fs.readFile(path.join(dirname, files[i]), loadFile);
      }
    }

  });
} 

module.exports = RawArticleProvider;