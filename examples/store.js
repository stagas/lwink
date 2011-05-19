var lwink = require('lwink')('node.js OR nodejs', {
  store: require('chaos')(__dirname + '/urls')
, translate: 'en'
, decodeEntities: true
})

lwink.on('tweets', function(tweets) {
  tweets.forEach(function(tweet) {
    require('util').log(tweet.urls.join(' ') + ' -- ' + tweet.text)
  })
})

lwink.runInterval(10000)