lwink
=====

What it does
------------

Polls the Twitter search API for tweets with links. Expands them with HEAD and replaces
tiny urls in the tweet.text with the expanded ones. Saves the links to a storage engine
or in memory so that it never emits the same link twice. Only unique content!

Installation
------------

    npm install lwink

Example
-------
```javascript
require('lwink')('node.js OR nodejs').runInterval(10000, function(links) {
  console.log(Object.keys(links))
})

```
Also see examples/

API Overview
------------
```javascript
var Lwink = require('lwink')

var lwink = Lwink('node.js OR nodejs')

// event emitter pattern

lwink.on('tweets', function(tweets) {
  // array of tweets
})

lwink.on('links', function(links) {
  // hash of links as keys - values as tweets
})

// running the search
lwink.run()

// or with a callback if you don't want to use
// the evented method
lwink.run(function(links, tweets) {
  // links hash and tweets array, use any
})

// perhaps run in an interval?
lwink.runInterval(ms)

// or
lwink.runInterval(ms, callback) // like above

// stop the damn thing
lwink.stop()

// options:

var lwink = Lwink('node.js OR nodejs', {
  store: storeEngine    // store engine to use. Only .get and .set are required
                        // so you can use almost any key value store
                        // defaults to an internal memory store
                        
, translate: 'en'       // translate tweets using google api (here: english)
                        // default: no translation
                        
, decodeEntities: true  // decode tweet html entities (requires module 'ent')
                        // default: false
                        
, skipFirst: false      // skip first search (useful when you don't want to
                        // spam a feed on init)
})

```

MIT licenced
