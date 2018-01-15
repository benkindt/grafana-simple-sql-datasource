# Run npm install at the dist/serverside folder to install all dependencies
#cd /usr/logdata/grafana-simple-sql-datasource/dist/serverside/
#npm install --quiet

cd /usr/logdata/grafana-simple-sql-datasource/dist/
npm install --quiet

# Run npm install at the dist/serverside folder to install all dependencies
cd /usr/logdata/grafana-simple-sql-datasource/node_modules/
npm install --quiet

# Start it
#node /usr/logdata/grafana-simple-sql-datasource/dist/serverside/sqlproxyserver.js