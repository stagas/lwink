var util = require('util')
  , http = require('http')
  , qs = require('querystring')
  , parseUrl = require('url').parse
  , EventEmitter = require('events').EventEmitter

var urlRegexp = new RegExp('(?:(?:(?:https?|ftp|file)://|www\.|ftp\.)[-A-Z0-9+&@#/%?=~_|$!:,.;]*[-A-Z0-9+&@#/%=~_|$]\|((?:mailto:)?[A-Z0-9._%+-]+@[A-Z0-9._%-]+\.[A-Z]{2,4})\\b)|"(?:(?:https?|ftp|file)://|www\.|ftp\.)[^"\r\n]+"?|\'(?:(?:https?|ftp|file)://|www\.|ftp\.)[^\'\r\n]+\'?', 'gi')

var Lwink = module.exports = function(q) {
  EventEmitter.call(this)
  this.q = q
  this.refresh_url = null
  this.urls = {}
  this.expanded = {}
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
        cb && cb(null, data)
      } catch(e) {
        cb && cb(e)
      }
    })
  }).on('error', cb)
}

Lwink.prototype.expand = function(url, cb) {
  if (this.expanded.propertyIsEnumerable(url)) {
    return cb && cb(null, this.expanded(url), false)
  }
  var self = this
  var parsed = parseUrl(url)
  var req = http.request({
    host: parsed.hostname
  , port: parsed.port || 80
  , path: parsed.pathname + (parsed.search || '')
  , method: 'HEAD'
  }, function(res) {
    self.expanded[url] = res.headers.location || url
    var unique = !self.urls.propertyIsEnumerable(self.expanded[url])
    self.urls[self.expanded[url]] = true
    cb && cb(null, self.expanded[url], unique)
  })
  req.on('error', cb)
  req.end()
}

Lwink.prototype.run = function(cb) {
  var self = this
  this.search(function(err, data) {
    if (err || !data) return
    self.refresh_url = data.refresh_url
    var urls = {}
    var newUrls = {}
    for (var i = 0, len = data.results.length; i < len; i++) {
      arr = data.results[i].text.match(urlRegexp)
      arr.forEach(function(url) {
        urls[url] = i
      })
    }
    ;(function next(arr) {
      var url = arr.shift()
      self.expand(url, function(err, newUrl, unique) {
        if (err) {
          console.log('Cannot HEAD', url)
          console.log(err)
          newUrl = url
        }
        if (unique) {
          newUrls[newUrl] = data.results[urls[url]]
          newUrls[newUrl].text = newUrls[newUrl].text.replace(url, newUrl)
        }
        if (arr.length) {
          process.nextTick(function() {
            next(arr)
          })
        } else {
          self.emit('links', newUrls)
          cb && cb(newUrls)
        }
      })
    }(Object.keys(urls)))
  })
}