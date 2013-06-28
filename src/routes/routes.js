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

var get_dummy = function(req,res,next) {

  res.json({
    "title": "DUMMY",
    "events": [{
      "title": "The Hour of Spliff Politics",
      "narrative": [{"type":"text", "value":"Now we've reached the hour of spliff politics. It's the time of the night when everyone knows who's got a spliff and which direction it's going."}]
    },
    {
      "title": "Give Casey a Nod",
      "narrative": [{"type":"text", "value":"He doesn't know Herbie sitting next to him, but to get a toke, he's got to start up some bullshit conversation until he gets passed the spliff."}]
    },
    {
      "title": "Casey engages Herbie",
      "narrative": [{"type":"text", "value":"\"Smells like subpar to me. Can't fault a bit of solid!\""}]
    },
    {
      "title": "Now look at Herbie",
      "narrative": [{"type":"text", "value":"Now look at Herbie's face. He knows what's up. He's just hoping Casey will run out of steam so he can pass the spliff to his mate, Felix!"}]
    },
    {
      "title": "But Casey is determined!",
      "narrative": [{"type":"text", "value":"\"I've got my own shit too\". He's gotta be clever to get in there! Just a few more laps to go! Casey is doing well, he's using his best anecdotes and Herbie now looks quite engaged in the conversation!"}]
    },
    {
      "title": "Felix is trying to get acknowledged",
      "narrative": [{"type":"text", "value":"\"Yea mhan! Fuckin homegrown!\" \" Yea that homegrown shit is good!\" \"Oh man, I just remembered! Nelsie is coming down with some Thai next week. We gotta hoof it man!\""}]
    },
    {
      "title": "Woah! Look at Casey's Face!",
      "narrative": [{"type":"text", "value":"Now it looks like it's all been a waste of time and energy. But he counters! \"Nelsie? Nelsie from Ruth? Man I know Nelsie from out West!\" It's neck-in-neck here in the final round!"}]
    },
    {
      "title": "Swoop!",
      "narrative": [{"type":"text", "value":"\" Hello my little space kitten! Here, give us a toke of that\""}]
    },
    {
      "title": "Boomshanka! An interception!",
      "narrative": [{"type":"text", "value":"But that's always the chance you take when it comes to Spliff Politics."}]
    }    
    ]
  })

}

/*
 * ENTRYPOINT: Configure the routes:
 */
exports.init = function(app) {

  //Load up articles
  articleProvider.loadDir(app.get('articleDir'));

  app.get('/articles',    list_articles);
  app.get('/articles/:id', get_article);

  app.get('/dummy', get_dummy);

  
}
