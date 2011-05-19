var config = {
  server: 'irc.freenode.net'
, nick: 'lwinky'
, channel: '#test-lwinky'
}
  
var irc = new(require('irc')).Client('irc.freenode.net', config.nick, {
  channels: [ config.channel ]
})

irc.me = function(channel, text) {
  irc.say(channel, '\u0001ACTION ' + text + '\u0001')
}

var lwink = require('lwink')('node.js OR nodejs', {
  store: require('chaos')(__dirname + '/urls')
, translate: 'en'
, decodeEntities: true
, skipFirst: true
})

irc.on('join', function(channel, nick) {
  if (nick == config.nick) {
    irc.me(channel, 'is active')
    lwink.on('tweets', function(tweets) {
      tweets.forEach(function(tweet) {
        irc.me(channel, '@' + tweet.from_user + ': ' + tweet.text)
      })
    })
    lwink.runInterval(10000)
  }
})

;['part', 'kick'].forEach(function(ev) {
  irc.on(ev, function(channel, nick) {
    if (nick == config.nick) {
      lwink.removeAllListeners('tweets')
      lwink.stop()
    }
  })
})

irc.on('raw', function(msg) {
  console.log(msg.prefix + ':', msg.command, msg.args.join(' '))
})

irc.on('error', function(e) {
  console.log(e)
})