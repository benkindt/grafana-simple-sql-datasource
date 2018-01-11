# grafana-simple-sql-datasource

Allows querying Apache Drill.

![SQL Plugi](https://raw.githubusercontent.com/gbrian/grafana-simple-sql-datasource/master/overview.png "Query editor")


## Usage
Copy the plugin into Grafana plugin folder.

**Add new datasource**
Add a new datasource to Grafana and set the url to:

````
http://myserver:port
````

Where:
 * **myserver:port** : The server where Apache Drill is running, usually on port 8047.

Verify connection:
* Datasource working reply after creation.
* Check data source type (Drill).
* If not working try switch Access-Mode (direct | proxy).
* Check ip/port.

## Features
Following features has been implemented

![Query editor](https://raw.githubusercontent.com/gbrian/grafana-simple-sql-datasource/master/query_editor.png "Query editor")

### Metrics
It is possible to define two different types: `timeseries` and `table`

### Annotation
Annotations are not supported.

## Notes
### Template
You can use `$from` and `$to` to refer to selected time period in your queries like:
You can add custom variables via Manage Dashboard -> Templating and use them just like '$from' and '$to'. See '$client'.
````
SELECT `message` as `value`, `Timestamp` as `timestamp` FROM dfs.`tmp/.../` WHERE `timestamp` >= '$from' AND `timestamp` <= '$to' AND `Client` LIKE '$client'
```` 

## Thanks to
Grafana team and [@bergquist](https://github.com/bergquist)
 
