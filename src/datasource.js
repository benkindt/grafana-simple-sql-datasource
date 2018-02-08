import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url || "";
    var m = /con\=(.*)/.exec(this.url.split("?")[1]);
    this.connection = m ? m[1]: null;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
  }

  buildDrillRequest(sql, from, to, limit, interval){
	  console.log("---log buildDrillRequest---");
	  // replace $from and $to in query string
	  console.log(from);
//    var timedsql = sql.replace("'$from'", from - 3600000).replace("'$to'", to + 3600000);	  
	  var timedsql = sql.replace("'$from'", from).replace("'$to'", to);
//	  console.log(timedsql);
	  if(sql === 'undefined'){
		  return { // return some random example query
          	"queryType" : "SQL", 
          	"query" : "SELECT salary as `value`, hire_date as `timestamp` FROM cp.`employee.json`"
          };
	  }
	  return { 
    	"queryType" : "SQL", 
    	"query" : timedsql
	  };
  }

  query(options) {
  		var isNumeric = function(input){
          return /^\d+$/.test(input);
        }
        var timeFunction = function toTimestamp(date){
  		   if(typeof(date) === "number"){
  			  return date;
  		   } else if (typeof(date) === "string"){
  			  var isnum = isNumeric(date);
  			  if(isnum){ // convert date to number datatype
  				 return Number(date);
  			  } else { // parse date from string format to number datatype
  				 return Date.parse(date);
  			  }
  		   } else {
  			  console.log("No 'timestamp' column or wrong datatype, expects date string or epoch in ms.");
  		   }
 		}

//	    console.log("---log query ... test---");
//	    console.log(options);
	    var query = this.buildQueryParameters(options);   
//       console.log(query.targets);
       
       query.targets = query.targets.filter(function (t) {
       	if((typeof t.hide) === 'undefined'){
       		t.hide = false;
       	}
           return !t.hide;
       });
       
       var isTableQuery = false;
       if (query.targets[0].type === 'table'){
//       	console.log("is Table Query");
       	isTableQuery = true;
       }
       
       if (query.targets.length <= 0) {
       	console.log("query.targets.length <= 0 ... is " + query.targets.length);
       	return this.q.when({ data: [] });
       }
       
       return this.loadData(query.targets[0].target, options.range.from.valueOf(), options.range.to.valueOf())
       .then(function (results) {
//		    console.log("---loadDate .then---");
		    console.log(results);
			if(results.data.columns.length === 0){
				console.log("Query returned no data.");
				return { data: [] };
			}
			
			var data;
			if(isTableQuery){
				console.log("Transform drill result for Table Query");
				var columns = results.data.columns.map(function (v, index) {
					if(v === "timestamp"){
						console.log("Found timestamp column.");
						return { text: v, type: "time", "sort": true, "desc": true };
					} else {
						if(isNumeric(results.data.rows[0][v])){
							console.log(index + " is Number " + v);
							return { text: v, type: "Number" };
						} else {
							console.log(index + " is String " + v);
							return { text: v, type: "String" };
						}
						
					}
				});
				var datapoints = results.data.rows.map(function (v) {
				  var array = [];
				  columns.forEach(function(el) {
					  var val;
					  if(isNumeric(v[el.text])){
						  if(el.text === "timestamp"){
							  var date = new Date(parseInt(v[el.text]));
//							  val = v[el.text];
							  val = date.toLocaleString();
						  } else {
							  val = Number.parseFloat(v[el.text]);
						  }
					  } else {
						  val = v[el.text];
					  }
					  array.push(val);
				  });
				  return array;
				});
				// maybe allow setting target name by input field?
				data = [  { columns: columns, rows: datapoints, type: "table" } ];
			} else { // else is timeseries
				console.log("Transform drill result for Timeseries Query");
				var datapoints = results.data.rows.map(function (v) {
				  var val;
				  if(isNumeric(v.value)){
					  val = Number.parseInt(v.value);
				  } else {
					  val = v.value;
				  }
				  return [val, timeFunction(v.timestamp)];
				});
				// maybe allow setting target name by input field?
				data = [  { target: query.targets[0].target, datapoints: datapoints } ];
			}
			console.log(data);
			return { data: data };
       });
  }

  testDatasource() {
	  return this.backendSrv.datasourceRequest({
          url: this.url + "/query.json",
          data: this.buildDrillRequest("SELECT * FROM cp.`employee.json` LIMIT 10"),
          method: 'POST'
        }).then(function (result) {
        	console.log(result);
          return { status: "success", message: "Data source is working", title: "Success" };
        }).catch(function (result) {
        	console.log(result);
          return { status: "error", message: result, title: "Error" };
        });
  }

  annotationQuery(options) {
    var annotationQuery = _.assignIn({}, options);
    annotationQuery.annotation.query = this.templateSrv.replace(options.annotation.query, {}, 'glob'); 
    
    return this.backendSrv.datasourceRequest({
      url: this.url,
      method: 'POST',
      data: this.buildDrillRequest("annotations", annotationQuery)
    }).then(result => {
      return result.data;
    });
  }

  metricFindQuery(options) {
	  var opsAsString = typeof options === "string";
      if (options && options.type == 'sql')
        // TODO: Parser?
        return this.q.when([]);
      var target = opsAsString ? options : options.target;
      return this.backendSrv.datasourceRequest({
          url: this.url + "/query.json",
          data: this.buildDrillRequest(target),
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
      }).then(this.mapToTextValue);
  }

  mapToTextValue(result) {
//	console.log(result);
//	console.log(result.data.rows);
  	var lf = result.data.columns[0];
      return _.map(result.data.rows, function (d, i) {
			return { text: d[lf], value: d[lf] };
      });
  }
  
  loadData(sql, from, to) {
//      console.log("---loadData---");
      var interval = Math.round((to - from) / this.maxDataPoints);
      var limit = this.maxDataPoints / this.buckets;
      var self = this;
      return this.backendSrv.datasourceRequest({
        url: this.url + "/query.json",
        data: this.buildDrillRequest(sql, from, to, limit, interval),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(function (response) {
        if (response.status === 200) {
          if (!response.data) {
            console.log("Oops! No response data?!");
            console.log(response);
          }
          return Promise.resolve( response );
        }
      });
    }

  buildQueryParameters(options) {
    var clonedOptions = _.cloneDeep(options);
    var targets = _.filter(clonedOptions.targets, target => 
      target.target !== 'select metric' && !target.hide);

    targets = _.map(targets, target => 
      _.assignIn(target, { target: this.templateSrv.replace(target.target, options.scopedVars, "distributed")}));

    clonedOptions.targets = targets;

    return clonedOptions;
  }
}
