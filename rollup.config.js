import { uglify } from "rollup-plugin-uglify";
import { minify } from "uglify-es";

import hashbang from 'rollup-plugin-hashbang';

import resolve from 'rollup-plugin-node-resolve';

export default [{
    input: 'build/ts/lib.js',
    external: [
        "crypto"
    ],
    plugins: [
        resolve(),
        uglify({ warnings: true, sourceMap: true }, minify)
    ],

    treeshake: true,

    output: [{
        file: 'build/amd/lib.js',
        format: 'amd',
        exports: 'named'
    }, {
        file: 'build/esm/lib.js',
        format: 'es',
        exports: 'named'
    }]
}, {
    input: 'build/ts/test/index.js',
    external: [ 'crypto', 'es-observable-tests' ],
    plugins: [
        resolve()
        // uglify({ warnings: true, sourceMap: true }, minify)
    ],

    treeshake: true,

    output: {
        file: 'build/cjs/test.js',
        format: 'cjs',
        exports: 'named'
    }
}, {
    input: [
        'build/ts/lib.js',
        'build/ts/bin.js',
    ],
    experimentalCodeSplitting: true,

    external: [ 'crypto' ],
    plugins: [
        hashbang(),
        resolve(),
        uglify({ warnings: true, sourceMap: true }, minify)
    ],

    treeshake: true,

    output: {
        dir: 'build/cjs/',
        format: 'cjs',
        exports: 'named'
    }
}];
