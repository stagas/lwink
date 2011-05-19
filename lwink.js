var util = require('util')
  , http = require('http')
  , qs = require('querystring')
  , parseUrl = require('url').parse
  , EventEmitter = require('events').EventEmitter
  , ent

var urlRegexp = new RegExp('(?:(?:(?:https?|ftp|file)://|www\.|ftp\.)[-A-Z0-9+&@#/%?=~_|$!:,.;]*[-A-Z0-9+&@#/%=~_|$]\|((?:mailto:)?[A-Z0-9._%+-]+@[A-Z0-9._%-]+\.[A-Z]{2,4})\\b)|"(?:(?:https?|ftp|file)://|www\.|ftp\.)[^"\r\n]+"?|\'(?:(?:https?|ftp|file)://|www\.|ftp\.)[^\'\r\n]+\'?', 'gi')

var Lwink = module.exports = function(q, opts) {
  if (!(this instanceof Lwink)) return new Lwink(q, opts)
  
  EventEmitter.call(this)
  
  this.q = q
  this.refresh_url = null
  this.stopped = true
  this.opts = opts || {}
  if (this.opts.decodeEntities) ent = require('ent')
  this.store = new Store(this.opts.store || new MemoryStore)
}

util.inherits(Lwink, EventEmitter)

Lwink.prototype.search = function(cb) {
  var query = { q: this.q + ' filter:links' }
  if (this.refresh_url) {
    query = qs.parse(this.refresh_url.substr(1))
  }
  query.result_type = 'recent'
  http.get({
    host: 'search.twitter.com'
  , path: '/search.json?' + qs.stringify(query)
  }, function(res) {
    var body = []
    res.on('data', function(chunk) {
      body.push(chunk)
    })
    res.on('end', function() {
      try {
        var data = JSON.parse(body.join(''))
      } catch(e) {
        return cb && cb(e)
      }
      cb && cb(null, data)
    })
  }).on('error', cb)
}

Lwink.prototype.expand = function(url, cb) {
  var self = this
  this.store.getExpanded(url, function(err, expanded) {
    if (expanded) return cb && cb(null, expanded, false)
    var parsed = parseUrl(url || '')
    var req = http.request({
      host: parsed.hostname
    , port: parsed.port || 80
    , path: parsed.pathname + (parsed.search || '')
    , method: 'HEAD'
    }, function(res) {
      self.store.setExpanded(url, res.headers.location || url, function(err, expanded) {
        self.store.getOrSetUniqueUrl(expanded, cb)
      })
    })
    req.on('error', cb)
    req.end()
  })
}

Lwink.prototype.run = function(cb) {
  var self = this
  this.stopped = false
  this.search(function(err, data) {
    if (err || !data || !data.results || !data.results.length) return
    if (!self.refresh_url) {
      self.refresh_url = data.refresh_url
      if (self.opts.skipFirst) return
    } else {
      self.refresh_url = data.refresh_url
    }
    var urls = {}
    var tweets = {}
    var links = {}
    for (var i = 0, len = data.results.length; i < len; i++) {
      arr = data.results[i].text.match(urlRegexp)
      arr.forEach(function(url) {
        urls[url] = i
      })
    }
    var urlsKeys = Object.keys(urls)
    if (!urlsKeys.length) return
    ;(function next(arr) {
      var url = arr.shift()
      self.expand(url, function(err, newUrl, unique) {
        var tweet = data.results[urls[url]]
          , id = tweet.id_str
        var proceed = function() {
          if (unique && self.opts.decodeEntities) tweets[id].text = ent.decode(tweets[id].text)
          if (arr.length) {
            process.nextTick(function() {
              next(arr)
            })
          } else {
            tweets = toArray(tweets)
            self.emit('links', links)
            self.emit('tweets', tweets)
            cb && cb(links, tweets)
          }
        }
        if (err) {
          self.emit('error', new Error('Cannot HEAD', url))
          newUrl = url
        }
        if (unique) {
          tweets[id] = tweets[id] || tweet
          tweets[id].urls = tweets[id].urls || []
          tweets[id].urls.push(newUrl)
          tweets[id].text = tweets[id].text.replace(url, newUrl)
          links[newUrl] = tweets[id]
        }
        if (unique && self.opts.translate && self.opts.translate != tweets[id].iso_language_code) {
          translate(tweets[id].text, tweets[id].iso_language_code, self.opts.translate, function(err, text) {
            tweets[id].text = text || tweets[id].text
            proceed()
          })
        } else proceed()
      })
    }(urlsKeys))
  })
}

Lwink.prototype.runInterval = function(interval, cb) {
  var self = this
  this.stopped = false
  ;(function run() {
    if (self.stopped) return
    self.run(cb)
    setTimeout(function() {
      run()
    }, interval)
  }())
}

Lwink.prototype.stop = function() {
  this.stopped = true
}

var Store = function(store) {
  this.store = store
}

Store.prototype.getExpanded = function(url, cb) {
  this.store.get('expanded_' + url, cb)
}

Store.prototype.setExpanded = function(url, expanded, cb) {
  this.store.set('expanded_' + url, expanded, function(err) {
    cb && cb(err, expanded)
  })
}

Store.prototype.getOrSetUniqueUrl = function(url, cb) {
  var self = this
  this.store.get('url_' + url, function(err) {
    if (err) {
      self.store.set('url_' + url, '1', function(err) {
        cb && cb(err, url, true)
      })
    } else {
      cb && cb(null, url, false)
    }
  })
}

var MemoryStore = function() {
  this.data = {}
}

MemoryStore.prototype.set = function(k, v, cb) {
  this.data[k] = v
  cb && cb(null)
}

MemoryStore.prototype.get = function(k, cb) {
  if (!this.data.propertyIsEnumerable(k)) return cb(new Error('Key ' + k + ' not found'))
  cb && cb(null, this.data[k])
}

function toArray(hash) {
  var arr = []
  Object.keys(hash).forEach(function(key) {
    arr.push(hash[key])
  })
  return arr
}

function translate(text, from, to, cb) {
  text = text
    .replace(/:/g, '__colon__')
    .replace(/;/g, '__semicolon__')
    .replace(/\//g, '__slash__')
    .replace(/@/g, '__at__')
    .replace(/#/g, '__num__')
  var query = { v: '1.0', langpair: from + '|' + to, q: text }
  http.get({
    host: 'ajax.googleapis.com'
  , path: '/ajax/services/language/translate?' + qs.stringify(query)
  }, function(res) {
    var body = []
    res.on('data', function(chunk) {
      body.push(chunk)
    })
    res.on('end', function() {
      try {
        var data = JSON.parse(body.join(''))
      } catch(e) {
        return cb && cb(e)
      }
      if (!data || data.responseStatus != 200
        || !data.responseData || !data.responseData.translatedText 
        || !data.responseData.translatedText.length) {
        return cb && cb(new Error('Could not translate'))
      }
      cb && cb(null, data.responseData.translatedText
        .replace(/__colon__/g, ':')
        .replace(/__semicolon__/g, ';')
        .replace(/__slash__/g, '/')
        .replace(/__at__/g, '@')
        .replace(/__num__/g, '#')
        )
    })
  }).on('error', cb)
}