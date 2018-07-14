if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['./build/amd/index.js'], function (index) {
        return index;
    });
} else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    // CommonJS
    exports = require('./build/cjs/index.js');
} else {
    return eval("import('./build/esm/index.js')");
}