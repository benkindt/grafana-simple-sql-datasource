// https://drill.apache.org/docs/rest-api/

var q = require("q");
var Client = require('node-rest-client').Client;
 
var client = new Client();

function drilldriver(options){
  this.options = options;
  //remove prefix "drill:"
  this.options.url = /drill:(.*)/.exec(options.url)[1];
}

drilldriver.prototype.buildQuery = function(cmd, parameters){
  if(parameters){
    var re = /[@$]([a-z0-9A-Z]*)/g;
    var m = null;
    while((m = re.exec(cmd)))
      if(parameters.hasOwnProperty(m[1]))
        cmd = cmd.replace(m[0], parameters[m[1]]);
  }
  return q.resolve(cmd);
}

drilldriver.prototype.get = function(url){
  var defer = q.defer();
  var req = client.get(this.options.url + url, defer.resolve);
  req.on('error', defer.reject);
  return defer.promise;
}

drilldriver.prototype.post = function(url, data){
  var defer = q.defer();
  var args = {
		  data: data,
		  headers: { "Content-Type": "application/json" }
  }
  var req = client.post(this.options.url + url, args, defer.resolve);
  req.on('error', defer.reject);
  return defer.promise;
}

drilldriver.prototype.connect = function(url){
  return this.get("/options.json");
}

drilldriver.prototype.query = function(command, parameters){ 
    var driver = this;
    console.log(isNumeric("78.01234"));
    console.log(isNumeric("7"));
    console.log(isNumeric("1996-01-01 00:00:00.0"));
    console.log(isNumeric("abc"));
    return this.buildQuery(command, parameters)
      .then(sql => driver.post("/query.json", {"queryType" : "SQL", "query" : sql}));
}

drilldriver.prototype.parseResults = function(results){
  if(!results || !results.rows.length)
    return {};
    
  var mapType = function(sqltype){
    if(_.filter(['int', 'byte', 'decimal', 'float', 'double', 'money', 'bit',
                  'numeric', 'real'],
              (sqlt) => sqltype.indexOf(sqlt) != -1).length != 0) 
      return "number";
    if(_.filter(['date', 'time'],
              (sqlt) => sqltype.indexOf(sqlt) != -1).length != 0) 
      return "time";
    return "string";
  }  
  
  // Try figure out types
  /*const typeCheck {
    number: function(n){

    }
  };*/
  var frow = results.rows[0];
  var types = Object.keys(frow).map(key => {
    frow[key]
    return "string";
  });
  //  results.columns = results.columns.map(c => { reutrn {}})  
  return results;
}

drilldriver.prototype.isNumeric(num){
	if (+num === +num) { return true; }
	else { return false; }
}

module.exports = drilldriver;