const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8888;
const config = require('./config');

// grab the packages we need
const { Crawler } = require("./lib/crawler.js");

const db = require('./lib/database.js');

const UserAgent = config.UserAgent;

const SOFTDELETE = `DELETE from url WHERE url = $1`

const UPSERT_URL = `INSERT INTO url
                    (url, domain, crawler_rank, last_read) values ($1, $2, $3, $4)
                    ON CONFLICT (url)
                    DO UPDATE SET crawler_rank = url.crawler_rank-($3), last_read=$4`;

const UPSERT_LINK = `INSERT INTO link (src, dst, crawler_blessing, last_read) values ($1, $2, $3, $4)
                    ON CONFLICT (src, dst)
                    DO UPDATE SET crawler_blessing=$3, last_read=$4`;


async function processNew() {
  crawler = new Crawler(db);
  console.log('starting a crawl:');
  db.each('SELECT * from url WHERE last_read is NULL', [], row => {
      try {
        const { host, protocol } = new URL(row.url);
        if (host != null && protocol != null)
          crawler.add(row.url, row.crawler_rank);
      } catch (e) {
        console.log(`didn't like URL ${row.url}, ignoring`, e);
      }
    })
    .then(async rows => {
      console.log(`Waiting for ${rows.length} crawls to complete...`)
      await crawler.complete;
      console.log('... and done, taking a breather');
      setTimeout(processNew, 60000);
    })
    .catch(err => console.error(err));

}

processNew();

app.get('/', (req, res, next) => res.redirect('https://www.factually.dev/'));

if (require.main === module) {
  app.listen(port, () => {
    console.log(`App listening on port ${port}`);
    console.log('Press Ctrl+C to quit.');
  });
}

exports = module.exports = app;
