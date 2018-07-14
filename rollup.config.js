import { uglify } from "rollup-plugin-uglify";
import { minify } from "uglify-es";

export default [{
    input: 'build/ts/index.js',
    external: [
        "crypto"
    ],
    plugins: [
        uglify({ warnings: true, sourceMap: true }, minify)
    ],

    treeshake: true,

    output: [{
        file: 'build/cjs/index.js',
        format: 'cjs',
        exports: 'named'
    }, {
        file: 'build/amd/index.js',
        format: 'amd',
        exports: 'named'
    }, {
        file: 'build/esm/index.js',
        format: 'es',
        exports: 'named'
    }]
}, {
    input: 'build/ts/test/index.js',
    external: [ ],
    plugins: [
        // uglify({ warnings: true, sourceMap: true }, minify)
    ],

    treeshake: true,

    output: {
        file: 'build/cjs/test.js',
        format: 'cjs',
        exports: 'named'
    }
}];
