# grafana-drill-datasource

Allows querying Apache Drill via REST interface.

![SQL Plugi](https://raw.githubusercontent.com/gbrian/grafana-simple-sql-datasource/master/overview.png "Query editor")


## Usage
Copy the plugin into Grafana plugin folder.

**Add new datasource to Grafana and set the url to:**

````
http://myserver:port
````

Where:
 * **myserver:port** : the server where Apache Drill is running, usually on port 8047.

Verify connection:
* "Datasource working" reply after datasource creation.

If not working, try:
* Check data source type (Drill).
* Check ip & port.
* Switch Access-Mode (direct | proxy).

## Features
Following features has been implemented

### Metrics
It is possible to define two different types: `timeseries` and `table`

### Annotation
Annotations are not supported so far.

## Notes
### Templating
You can use `$from` and `$to` to refer to the selected time period in your queries.
(strings are replaced in javascript query function)
````
SELECT `message` as `value`, `Timestamp` as `timestamp` FROM dfs.`tmp/.../` 
WHERE `timestamp` >= '$from' AND `timestamp` <= '$to' AND `Client` LIKE '$client'
```` 
### Grafana Templating
You can also add custom variables to your dashboard. Go to "Manage Dashboard -> Templating" and use them just like '$from' and '$to' in the queries. See '$client'. (select variable value with dropdown in Grafana)

### Grunt
You can use Grunt for automation. Change code in src folder and run `grunt` or use `grunt watch`. See gruntfile.js for more information what's happening.
````
npm install -g grunt-cli
npm install grunt --save-dev
grunt
````
