var assert = require('assert');
var ent = require('ent');

exports.amp = function () {
    var a = 'a & b & c';
    var b = 'a &amp; b &amp; c';
    assert.eql(ent.encode(a), b);
    assert.eql(ent.decode(b), a);
};

exports.html = function () {
    var a = '<html> © π " \'';
    var b = '&lt;html&gt; &copy; &pi; &quot; &apos;';
    assert.eql(ent.encode(a), b);
    assert.eql(ent.decode(b), a);
};

exports.num = function () {
    var a = String.fromCharCode(1337);
    var b = '&#1337;';
    assert.eql(ent.encode(a), b);
    assert.eql(ent.decode(b), a);
};
