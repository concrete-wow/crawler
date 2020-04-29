// grab the packages we need
var SimpleCrawler = require( "simplecrawler" );

const config = require( '../config' );

const UPSERT_URL = `INSERT INTO url
                    (url, domain, crawler_rank, last_read) values ($1, $2, $3, $4)
                    ON CONFLICT (url)
                    DO UPDATE SET crawler_rank = url.crawler_rank-($3), last_read=$4`;

const UPSERT_LINK = `INSERT INTO link (src, dst, crawler_blessing, last_read) values ($1, $2, $3, $4)
                    ON CONFLICT (src, dst)
                    DO UPDATE SET crawler_blessing=$3, last_read=$4`;

class Crawler {

  constructor( db ) {

    const ranks = this.ranks = new URLMap( db );
    this.db = db;
    this.started = false;
    // SimpleCrawl wants an initial URL, but we don't know what we will be
    // crawling yet, so we give it something to keep it happy.
    this.crawler = new SimpleCrawler( '' );
    Object.assign( this.crawler, {
      interval: config.interval,
      maxConcurrency: config.maxConcurrency,
      maxDepth: config.maxDepth,
      filterByDomain: false,
      UserAgent: config.UserAgent,
      supportedMimeTypes: ['text/html'],
      downloadUnsupported: false
    } );

    this.complete = new Promise( ( resolve, reject ) => {
      this.crawler.on( "fetchcomplete", async function ( item, data, res ) {
        const now = new Date();
        if ( item.url.match( config.ignoreFiles ) )
          return;

        var finalise = this.wait();

        try {
          const rank = await ranks.get( (item.referrer && item.referrer.length) ? item.referrer : item.url );
          console.log( `processing ${item.url} with ${rank}` );

          await db.none( UPSERT_URL,
            [ item.url, item.host, rank / item.depth, now ]
          );

          if ( item.referrer != null && item.referrer !== '' && !( new URL( item.referrer ) )
            .pathname.match( /robots.txt/ ) ) {
            await db.none( UPSERT_URL,
              [ item.referrer, item.host, rank / item.depth, now ]
            );
            await db.none( UPSERT_LINK,
              [ item.referrer, item.url, rank / item.depth, now ]
            );
          } else {
            if ( item.depth > 1 )
              console.log( 'no referrer: ', item.url );
          }
          console.log( 'inserted: ', item.url )
        } catch ( e ) {
          // We mostly aren't interested
          console.log( 'insert failed: ', item, e )
        } finally {
          finalise();
        }
      } );
      this.crawler.on( "complete", resolve );
    } );
  }

  add( url, rank ) {
    const canonical = ( new URL( url ) )
      .toString();

    this.ranks.set( canonical, rank );

    const trigger = ( canonical !== url ) ?
      this.db.none( 'UPDATE url SET url = $2 WHERE URL = $1', [ url, canonical ] ) :
      Promise.resolve();

    trigger.then( () => {} )
      .catch( err => {
        console.log( `Non-canonical ${url} not in database` );
      } )
      .finally( () => {
        //console.log( `Adding crawl of: ${canonical} with rank ${rank}` );

        this.crawler.queueURL( canonical, canonical );
        if ( !this.started )
          this.started = this.crawler.start();
      } );

  }
}

// DB aware Map that queries url rank in database if it isn't already present in Map.
class URLMap extends Map {
  constructor( db ) {
    super();
    this.db = db;
  }
  async get( url ) {
    return this.has( url ) ? super.get( url ) :
      this.db.one( 'SELECT crawler_rank FROM url WHERE url = $1', [ url ], row => row.crawler_rank )
      .then( rank => ( this.set( url, rank ), rank ) );
  }
}

exports = module.exports = { Crawler };
