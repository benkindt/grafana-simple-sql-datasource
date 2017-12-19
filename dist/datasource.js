"use strict";

System.register(["lodash"], function (_export, _context) {
  "use strict";

  var _, _createClass, GenericDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export("GenericDatasource", GenericDatasource = function () {
        function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
            console.log("---log GenericDatasource---");
          _classCallCheck(this, GenericDatasource);
          this.type = instanceSettings.type;
          this.url = instanceSettings.url || "";
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
          this.buckets = 2; // FIXME! calculate this value
          this.maxDataPoints = 10000; // FIXME! calculate this value
        }

        _createClass(GenericDatasource, [{
          key: "buildDrillRequest",
          value: function buildDrillRequest(sql, from, to, limit, interval) {
        	  console.log("---log buildDrillRequest---");
        	  if(sql === 'undefined'){
        		  return { 
                  	"queryType" : "SQL", 
                  	"query" : "SELECT salary as `value`, hire_date as `timestamp` FROM cp.`employee.json` WHERE hire_date > '1996-01-01' AND supervisor_id = 5"
                  };
        	  }
        	  console.log(this.url);
            return { 
            	"queryType" : "SQL", 
            	"query" : sql
            };
          }
        }, {
          key: "query",
          value: function query(options) {
        	  console.log("---log query ... test---");
        	  console.log(options);
            var query = this.buildQueryParameters(options);
            
            console.log(query.targets);
            
            query.targets = query.targets.filter(function (t) {
            	console.log("query targets filter function");
            	var pass;
            	if((typeof t.hide) === 'undefined'){
            		t.hide = false;
            	}
                return !t.hide;
            });
            
            if (query.targets.length <= 0) {
            	console.log("query.targets.length <= 0 ... is " + query.targets.length);
            	console.log(query.targets);
            	return this.q.when({ data: [] });
            }
            var timeFunction = function toTimestamp(strDate){
     		   var stamp = Date.parse(strDate);
    		   return stamp;
    		}
            console.log("b4 return loadData");
            return this.loadData(query.targets[0].target, options.range.from.valueOf(), options.range.to.valueOf())
            .then(function (results) {
            	console.log("---loadDate .then---");
              var datapoints = results.data.rows.map(function (v) {
            	  var val = Number.parseInt(v.value);
            	  var timest = timeFunction(v.timestamp);
            	  return [val, timest];
              });
              var data = [  { target: query.targets[0].target, datapoints: datapoints } ]; // maybe allow setting target name by input field?
              console.log(data);
              return { data: data };
            });
          }
        }, {
          key: "testDatasource",
          value: function testDatasource() {
              console.log("---log testDatasource---");
            return this.backendSrv.datasourceRequest({
              url: this.url + "/query.json",
              data: this.buildDrillRequest("SELECT * FROM cp.`employee.json` LIMIT 10"),
              method: 'POST'
            }).then(function (result) {
            	console.log("--- test successful ---");
            	console.log(result);
              return { status: "success", message: "Data source is working", title: "Success" };
            }).catch(function (result) {
            	console.log("--- test not successful ---");
            	console.log(result);
              return { status: "error", message: result, title: "Error" };
            });
          }
        }, {
          key: "annotationQuery",
          value: function annotationQuery(options) {
            var annotationQuery = _.assignIn({}, options);
            annotationQuery.annotation.query = this.templateSrv.replace(options.annotation.query, {}, 'glob');

            return this.backendSrv.datasourceRequest({
              url: this.url,
              method: 'POST',
              data: this.buildRequest("annotations", annotationQuery)
            }).then(function (result) {
              return result.data;
            });
          }
        }, {
          key: "metricFindQuery",
          value: function metricFindQuery(options) {
            var opsAsString = typeof options === "string";
            if (options && options.type == 'sql')
              // TODO: Parser?
              return this.q.when([]);
            var target = opsAsString ? options : options.target;
            var interpolated = {
              target: this.templateSrv.replace(target, null, 'regex')
            };

            return this.backendSrv.datasourceRequest({
              url: this.url,
              data: this.buildRequest("search", interpolated),
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).then(this.mapToTextValue);
          }
        }, {
          key: "mapToTextValue",
          value: function mapToTextValue(result) {
            return _.map(result.data, function (d, i) {
              if (d && d.text && d.value) {
                return { text: d.text, value: d.value };
              } else if (_.isObject(d)) {
                return { text: d, value: i };
              }
              return { text: d, value: d };
            });
          }
        }, {
            key: 'loadData',
            value: function loadData(sql, from, to) {
            	console.log("---loadData--- items & properties following");
              var interval = Math.round((to - from) / this.maxDataPoints);
              var limit = this.maxDataPoints / this.buckets;
              var self = this;
              return this.backendSrv.datasourceRequest({
                url: this.url + "/query.json",
                data: this.buildDrillRequest(sql, from, to, limit, interval),
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
//                params: {
//                  items: items,
//                  properties: properties,
//                  from: from,
//                  to: to,
//                  limit: limit,
//                  interval: interval,
//                  op: 'avg'
//                }
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
          }, {
          key: "buildQueryParameters",
          value: function buildQueryParameters(options) {
            var _this = this;

            var clonedOptions = _.cloneDeep(options);
            var targets = _.filter(clonedOptions.targets, function (target) {
              return target.target !== 'select metric' && !target.hide;
            });

            targets = _.map(targets, function (target) {
              return _.assignIn(target, { target: _this.templateSrv.replace(target.target, options.scopedVars, "distributed") });
            });

            clonedOptions.targets = targets;

            return clonedOptions;
          }
        }]);

        return GenericDatasource;
      }());

      _export("GenericDatasource", GenericDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
