/**
 * Author: Jeff Whelpley
 * Date: 1/20/15
 *
 * Simple watch implementation
 */
module.exports = function (gulp, opts) {
    var watchCode = opts.watchCode || [].concat(opts.unitTargetCode);

    return function () {
        gulp.watch(watchCode, ['lint']);
    };
};