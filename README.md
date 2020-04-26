# Crawler
This is the factually crawler.

It has no interfaces, just connects to the database and roams around the Internet from time to time seeking URLs for our pagerank engine to rate.

## Using

See [Database Connection](#database-connection) below, once that is sorted(!), running the app is simple as:

```
yarn install
yarn start
```

## Docker

There is a Dockerfile, and it works well given that the crawler is a pure stateless engine which just connects to a database to get work and produce results

## Database connection

This is the hard bit. Like all the Concrete Wow stuff, crawler is a stateless container that can run anywhere on the Internet.

It needs a secure Postgres instance, for which we use client certificates in production, this is the environment that it needs (spelled in bash):
```
export CLIENT_CERT="-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----"
export CLIENT_KEY="-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----"
export CA_CERT="-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----"
export DB_HOST="1.2.3.4"
export DB_PORT="5432"
export DB_NAME="concretewow"
export DB_USER="postgres"
export DB_PASSWORD="furbleflab"
```

Alternatively, for hosting on GCP, you can use their Cloud SQL Connector to reduce the number of secrets (especially the pesky multi-line PEM literals which it is impossible to get into Cloud Run without using a proprietary API):
```
export INSTANCE_CONNECTION_NAME="database:ProjectID:databasename"
export DB_NAME="concretewow"
export DB_USER="postgres"
export DB_PASSWORD="furbleflab"
```
