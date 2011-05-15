var Lwink = require('./lwink')

var lwink = new Lwink('node.js OR nodejs OR nodeconf OR jsconf OR #js')

lwink.on('links', function(links) {
  Object.keys(links).forEach(function(link) {
    console.log(new Date().toUTCString(), '-', link, ':', links[link].text)
  })
})

;(function run() {
  lwink.run()
  setTimeout(function() {
    run()
  }, 60000)
}())
