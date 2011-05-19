require('lwink')('node.js OR nodejs').runInterval(10000, function(links) {
  console.log(Object.keys(links))
})