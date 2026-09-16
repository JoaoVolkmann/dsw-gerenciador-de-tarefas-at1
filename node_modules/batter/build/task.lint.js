/**
 * Author: Jeff Whelpley
 * Date: 1/20/15
 *
 * Use jshint to lint the code
 */
var eslint = require('gulp-eslint');

module.exports = function (gulp, opts) {
    var commonCode = ['build/*.js'];
    var lintCode = opts.lintCode ||
        commonCode.concat(opts.unitTestCode, opts.unitTargetCode);

    return function () {
        return gulp.src(lintCode)
            .pipe(eslint())
            .pipe(eslint.format());
    };
};
