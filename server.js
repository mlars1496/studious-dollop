#!/bin/env node

var express = require('express');
var fs      = require('fs');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;

var App = function(){

  // Scope
  var self = this;

  // Setup
  self.dbServer = new mongodb.Server(process.env.OPENSHIFT_MONGODB_DB_HOST,parseInt(process.env.OPENSHIFT_MONGODB_DB_PORT));
  self.db = new mongodb.Db(process.env.OPENSHIFT_APP_NAME, self.dbServer, {auto_reconnect: true});
  self.dbUser = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
  self.dbPass = process.env.OPENSHIFT_MONGODB_DB_PASSWORD;

  self.ipaddr  = process.env.OPENSHIFT_NODEJS_IP;
  self.port    = parseInt(process.env.OPENSHIFT_NODEJS_PORT) || 8080;
  if (typeof self.ipaddr === "undefined") {
    console.warn('No OPENSHIFT_NODEJS_IP environment variable');
  };


  // Web app logic
  self.routes = {};
  self.routes['health'] = function(req, res){ res.send('1'); };
  
  //default response with info about app URLs
  self.routes['root'] = function(req, res){ 
    res.send(''); 
  };

  //returns all the parks in the collection
  self.routes['returnAllParks'] = function(req, res){
    res.end('success');
  };

  //find a single park by passing in the objectID to the URL
  self.routes['returnAPark'] = function(req, res){
     res.end('success');
  }

  //find parks near a certain lat and lon passed in as query parameters (near?lat=45.5&lon=-82)
  self.routes['returnParkNear'] = function(req, res){
    //in production you would do some sanity checks on these values before parsing and handle the error if they don't parse
    var lat = parseFloat(req.query.lat);
    var lon = parseFloat(req.query.lon);
 //    db.collection('places').geoNear(50, 50, {$maxDistance:10}, function(err, result) {
   // if(err) return console.dir(err)
//   assert.equal(result.results, 2);
//  });
//    self.db.collection('parkpoints').find( {"pos" : { $near : [lon,lat], $maxDistance: 10}}).limit(5).toArray(function(err,names){
	
	
self.db.collection('parkpoints').geoNear([lon,lat], {limit:5, spherical:true}, function(err, docs){
    if(err){
   res.header("Content-Type:","application/json");
      res.end(JSON.stringify(docs));
	}
    else{
     res.header("Content-Type:","application/json");
      res.end(JSON.stringify(docs));
	}
});

  };

  //find parks near a certain park name, lat and lon (name?lon=10&lat=10)
  self.routes['returnParkNameNear'] = function(req, res){
    //in production you would do some sanity checks on these values before parsing and handle the error if they don't parse
    res.end('success');
  };

  //saves new park
  self.routes['postAPark'] = function(req, res){
    //in production you would do some sanity checks on these values before parsing and handle the error if they don't parse
    var lat = parseFloat(req.body.lat);
    var lon = parseFloat(req.body.lon);
	 	  var m = req.body.m;  
	 var t = req.body.t;
	  var f = req.body.f;
    self.db.collection('parkpoints').insert( {'m' : m, 'f' : f, 't' : t,'pos' : [lon,lat]}, {w:1}, function(err, records){
    if (err) { throw err; }
    res.end('success');
    });
  };


self.routes['delAPark'] = function(req, res){
   self.db.collection('parkpoints').deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
   if (err) { throw err; }
    res.end('success');
    });
  };
  
 
  // Web app urls
  self.app  = express();

  //This uses the Connect frameworks body parser to parse the body of the post request
  var bodyParser = require('body-parser');
  var methodOverride = require('method-override');
  // parse application/x-www-form-urlencoded
  self.app.use(bodyParser.urlencoded());
  // parse application/json
  self.app.use(bodyParser.json());
  // override with POST having ?_method=DELETE
  self.app.use(methodOverride('_method'))

  //define all the url mappings
  self.app.get('/health', self.routes['health']);
  self.app.get('/', self.routes['root']);
  self.app.get('/ws/parks', self.routes['returnAllParks']);
  self.app.get('/ws/parks/park/:id', self.routes['returnAPark']);
  self.app.get('/ws/parks/near', self.routes['returnParkNear']);
  self.app.get('/ws/parks/name/near/:name', self.routes['returnParkNameNear']);
  self.app.post('/ws/parks/park', self.routes['postAPark']);
  self.app.get('/ws/dy/:id', self.routes['delAPark']);

  // Logic to open a database connection. We are going to call this outside of app so it is available to all our functions inside.
  self.connectDb = function(callback){
    self.db.open(function(err, db){
      if(err){ throw err };
      self.db.authenticate(self.dbUser, self.dbPass, {authdb: "admin"}, function(err, res){
        if(err){ throw err };
        callback();
      });
    });
  };
  
  
  //starting the nodejs server with express
  self.startServer = function(){
    self.app.listen(self.port, self.ipaddr, function(){
      console.log('%s: Node server started on %s:%d ...', Date(Date.now()), self.ipaddr, self.port);
    });
  }

  // Destructors
  self.terminator = function(sig) {
    if (typeof sig === "string") {
      console.log('%s: Received %s - terminating Node server ...', Date(Date.now()), sig);
      process.exit(1);
    };
    console.log('%s: Node server stopped.', Date(Date.now()) );
  };

  process.on('exit', function() { self.terminator(); });

  self.terminatorSetup = function(element, index, array) {
    process.on(element, function() { self.terminator(element); });
  };

  ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGPIPE', 'SIGTERM'].forEach(self.terminatorSetup);

};

//make a new express app
var app = new App();

//call the connectDb function and pass in the start server command
app.connectDb(app.startServer);
