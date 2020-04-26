const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8888;
const config = require('./config');

// grab the packages we need
var Crawler = require("simplecrawler");

const db = require('./lib/database.js');

const UserAgent = "Factually news crawler based on Node/simplecrawler <version> (see https://www.factually.dev/)"

const SOFTDELETE = `DELETE from url WHERE url = $1`

const UPSERT_URL = `INSERT INTO url
                    (url, domain, crawler_rank, last_read) values ($1, $2, $3, $4)
                    ON CONFLICT (url)
                    DO UPDATE SET crawler_rank = url.crawler_rank-($3), last_read=$4`;

const UPSERT_LINK = `INSERT INTO link (src, dst, crawler_blessing, last_read) values ($1, $2, $3, $4)
                    ON CONFLICT (src, dst)
                    DO UPDATE SET crawler_blessing=$3, last_read=$4`;

function crawl(url, rank) {

  if (this.crawler == null) {
    this.promise = new Promise((resolve, reject) => {
      this.crawler = new Crawler(url);
      Object.assign(this.crawler, {
        interval: 1000,
        maxConcurrency: 100,
        maxDepth: 100,
        filterByDomain: false,
        UserAgent
      });
      this.crawler.on("fetchcomplete", async function (item, data, res) {
        console.log('got url', item.url)
        const now = new Date();
        if (item.url.match(config.ignoreFiles)) {
          console.log(`Ignoring file ${item.url}`);
          return;
        }
        var finalise = this.wait();

        try {
          await db.none(UPSERT_URL,
            [item.url, item.host, rank / item.depth, now]
          );

          if (item.referrer != null && !(new URL(item.referrer))
            .pathname.match(/robots.txt/)) {
            await db.none(UPSERT_URL,
              [item.referrer, item.host, rank / item.depth, now]
            );
            await db.none(UPSERT_LINK,
              [item.referrer, item.url, rank / item.depth, now]
            );
          } else {
            if (item.depth > 1)
              console.log('no referrer: ', item.url);
          }
          // if we are at top level and only difference between thing we were called with and this
          // is http://foo.bar.com vs http://foo.bar.com/ then kill the redundant one
          // If we don't do this then the seed gets left behind with no fetch so we keep re-crawling it
          // This is soft if there is a hanging referrer ref
          if (item.depth === 1 && item.url !== url)
            db.none(SOFTDELETE, [url])
            .catch(() => {});

          console.log('inserted: ', item.url)
        } catch (e) {
          // We mostly aren't interested
          console.log('insert failed: ', item.url, e)
        } finally {
          finalise();
        }
      });
      crawler.on("complete", resolve);

      crawler.start();
    });
  } else {
    crawler.queueURL(url);
  }

  return (this.promise);

}

async function processNew() {
  workers = new Array();
  console.log('starting a crawl:');
  db.each('SELECT * from url WHERE last_read is NULL', [], row => {
      try {
        const { host, protocol } = new URL(row.url);
        if (host != null && protocol != null)
          workers.push(crawl(row.url, row.crawler_rank));
      } catch (e) {
        console.log(`didn't like URL ${row.url}, ignoring`);
      }
    })
    .then(async () => {
      console.log(`Waiting for ${workers.length} crawls to complete...`)
      await Promise.all(workers);
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
