/**
 * Author: Jeff Whelpley
 * Date: 1/20/15
 *
 * Gulp task for testing
 */
var Q           = require('q');
var mocha       = require('gulp-mocha');
var istanbul    = require('gulp-istanbul');

module.exports = function (gulp, opts) {
    var reporter = opts.reporter || 'progress';
    var useTestCoverage = opts.cov;
    var taste = opts.taste;

    if (!taste) {
        throw new Error('Pass in taste to batter.whip');
    }

    opts.intTestCode = opts.intTestCode || 'test/integration/**/*.js';
    opts.apiTestCode = opts.apiTestCode || 'test/api/**/*.js';
    opts.extTestCode = opts.extTestCode || 'test/external/**/*.js';
    opts.intTargetCode = opts.intTargetCode || 'lib/**/*.js';

    // initialize taste so we can use it with our tests
    taste.firstBite(opts.targetDir);

    // function for running one of the tests
    function runTest(targetCode, testCode, done) {
        var beforePromise = new Q();
        if (testCode === opts.intTestCode && opts.intBefore) {
            beforePromise = opts.intBefore();
        }

        if (useTestCoverage) {
            beforePromise.then(function () {
                gulp.src(targetCode)
                    .pipe(istanbul())
                    .pipe(istanbul.hookRequire())
                    .on('finish', function () {
                        gulp.src(testCode)
                            .pipe(mocha({
                                growl: true,
                                ui: 'bdd',
                                reporter: reporter,
                                timeout: 5000
                            }))
                            .pipe(istanbul.writeReports({
                                dir: opts.testDir + '/coverage',
                                reportOpts: { dir: opts.testDir + '/coverage' }
                            }))
                            .on('end', function () {
                                if (opts.intAfter) {
                                    opts.intAfter();
                                }

                                done();
                            });
                    });
            }).done();
        }
        else {
            beforePromise.then(function () {
                gulp.src(testCode)
                    .pipe(mocha({
                        growl: true,
                        ui: 'bdd',
                        reporter: reporter,
                        timeout: 5000
                    }))
                    .on('end', function () {
                        if (opts.intAfter) {
                            opts.intAfter();
                        }

                        done();
                    });
            }).done();
        }
    }

    return {
        integration: function (done) {
            runTest(opts.intTargetCode, opts.intTestCode, done);
        },
        api: function (done) {
            runTest(opts.intTargetCode, opts.apiTestCode, done);
        },
        external: function (done) {
            runTest(opts.intTargetCode, opts.extTestCode, done);
        },
        unit: function (done) {
            runTest(opts.unitTargetCode, opts.unitTestCode, done);
        },
        '': ['test.unit']
    };
};


