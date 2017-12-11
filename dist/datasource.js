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
          value: function buildDrillRequest(sql) {
        	  console.log("---log buildDrillRequest---");
        	  console.log(sql);
        	  console.log(this.url);
            return { 
            	"queryType" : "SQL", 
            	"query" : sql
            };
          }
        }, {
          key: "query",
          value: function query(options) {
        	  console.log("---log query---");
        	  console.log(options);
            var query = this.buildQueryParameters(options);
            
            query.targets = query.targets.filter(function (t) {
                return !t.hide;
            });
            
            if (query.targets.length <= 0) {
              return this.q.when({ data: [] });
            }
            
            var items = [];
            var properties = [];

            _.forEach(query.targets, function (target) {
              if (target.item && !_.includes(items, target.item)) {
                items.push(target.item);
              }
              if (target.property && !_.includes(properties, target.property)) {
                properties.push(target.property);
              }
            });
            if (items.length <= 0) {
              return this.q.when({ data: [] });
            }
            var itemVal = items.join(' ');
            // if not set, keep undefined to load all properties
            var propertyVal = undefined;
            if (properties.length > 0) {
              propertyVal = properties.join(' ');
            }
            
//            var temp = this.backendSrv.datasourceRequest({
//                url: this.url + "/query.json",
//                data: this.buildDrillRequest(query.targets[0].target),
//                method: 'POST'
//              });
//            console.log(temp);
//            return temp;
            return this.loadData(itemVal, propertyVal, options.range.from.valueOf(), options.range.to.valueOf())
            .then(function (results) {
              var data = results.map(function (v) {
                var targetName = self.prefixName(self.url, "lf:", v.item, v.property);
                var values = v.values;
                // get the config entry to access scale etc.
                var target = _.filter(query.targets, function (target) {
                  var _item = target.item.split(/[ ]+/)[1];
                  var _property = target.property.split(/[ ]+/)[1];
                  return v.item === _item && v.property === _property;
                })[0];
                var scale = target && target.scale ? target.scale : 1;

                if (typeof scale === 'undefined') {
                  scale = 1;
                }

                var datapoints = values.map(function (d) {
                  return [d.value * scale, d.time];
                });
                return { target: targetName, datapoints: datapoints };
              });
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
            value: function loadData(items, properties, from, to) {
              var interval = Math.round((to - from) / this.maxDataPoints);
              var limit = this.maxDataPoints / this.buckets;
              var self = this;
              return this.backendSrv.datasourceRequest({
                url: this.url + "/query.json",
                data: this.buildDrillRequest(query.targets[0].target),
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                params: {
                  items: items,
                  properties: properties,
                  from: from,
                  to: to,
                  limit: limit,
                  interval: interval,
                  op: 'avg'
                }
              }).then(function (response) {
                if (response.status === 200) {
                  var loadOlderData = false;
                  var promises = [];
                  if (!response.data) {
                    console.log("Oops! No response data?!");
                    console.log(response);
                  }
                  Object.keys(response.data).forEach(function (item) {
                    var newItemData = response.data[item];
                    Object.keys(newItemData).forEach(function (property) {
                      var newPropertyData = newItemData[property];
                      if (!newPropertyData || newPropertyData.length == 0) {
                        return;
                      } else {
                        // LF returns data in latest-first order
                        newPropertyData.reverse();
                      }

                      if (newPropertyData.length == limit) {
                        // limit reached, fetch earlier blocks, keep from
                        // but stop at earliest time already read - 1
                        var localTo = newPropertyData[0].time - 1;
                        promises.push(self.loadData(item, property, from, localTo)
                        .then(function (d) {
                          // FIXME: d is an array! handle appropriately
                          return { item: item, property: property, values: d[0].values.concat(newPropertyData) };
                        }));
                      } else {
                        promises.push({ item: item, property: property, values: newPropertyData });
                      }
                    });
                  });
                  // see below
                  //return Promise.all(promises);
                  return self.promiseAll(promises);
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
