




var data = function(req, res){
  res.json({name:"hello"});
};


/*
 * ENTRYPOINT: Configure the routes:
 */
exports.init = function(app) {

  app.get('/data', data);
  
}
