//  OpenShift sample Node application
var express = require('express'),
    fs      = require('fs'),
    app     = express();  



Object.assign=require('object-assign')

 

 //This uses the Connect frameworks body parser to parse the body of the post request
  var bodyParser = require('body-parser');
  var methodOverride = require('method-override');
  // parse application/x-www-form-urlencoded
   app.use(bodyParser.urlencoded());
  // parse application/json
   app.use(bodyParser.json());
  // override with POST having ?_method=DELETE
   app.use(methodOverride('_method'))
 


var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

	

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};






app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');  
    var points = db.collection('parkpoints');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
       res.end('success');
    });
  } else {
     res.end('success');
  }
});






app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
       res.end('success');
    });
  } else {
     res.end('success');
  }
  
  
});

 



app.get('/near', function (req, res) {
	
    var lat = parseFloat(req.query.lat);
    var lon = parseFloat(req.query.lon);
	
    if (!db) {
      initDb(function(err){});
    }
		db.collection('parkpoints').geoNear([lon,lat], {limit:5, spherical:true}, function(err, docs){
		    if(err){
		   res.header("Content-Type:","application/json");
		      res.end(JSON.stringify(docs));
			}
		    else{
		     res.header("Content-Type:","application/json");
		      res.end(JSON.stringify(docs));
			}
		});

});






 
  





// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
