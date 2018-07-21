if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['./build/amd/lib.js'], function (index) {
        return index;
    });
} else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    // CommonJS
    exports = require('./build/cjs/lib.js');
} else {
    return eval("import('./build/esm/lib.js')");
}