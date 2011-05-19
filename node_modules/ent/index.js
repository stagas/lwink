var fs = require('fs');
var entities = JSON.parse(
    fs.readFileSync(__dirname + '/entities.json', 'utf8')
);

var revEntities = {};
Object.keys(entities).forEach(function (key) {
    var e = entities[key];
    var s = typeof e === 'number' ? String.fromCharCode(e) : e;
    revEntities[s] = key;
});

exports.encode = function (str) {
    if (typeof str !== 'string') {
        throw new TypeError('Expected a String');
    }
    
    return str.split('').map(function (c) {
        var e = revEntities[c];
        var cc = c.charCodeAt(0);
        if (e) {
            return '&' + (e.match(/;$/) ? e : e + ';');
        }
        else if (cc > 127) {
            return '&#' + cc + ';';
        }
        else {
            return c;
        }
    }).join('');
};

exports.decode = function (str) {
    if (typeof str !== 'string') {
        throw new TypeError('Expected a String');
    }
    
    return str
        .replace(/&#(\d+);?/, function (_, code) {
            return String.fromCharCode(code);
        })
        .replace(/&([^;\W]+;?)/g, function (m, e) {
            var ee = e.replace(/;$/, '');
            var target = entities[e]
                || (e.match(/;$/) && entities[ee])
            ;
            
            if (typeof target === 'number') {
                return String.fromCharCode(target);
            }
            else if (typeof target === 'string') {
                return target;
            }
            else {
                return m;
            }
        })
    ;
};
