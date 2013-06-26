




var data = function(req, res){
  res.json({name:req.params.id});
};


/*
 * ENTRYPOINT: Configure the routes:
 */
exports.init = function(app) {

  app.get('/data/:id', data);
  
}
