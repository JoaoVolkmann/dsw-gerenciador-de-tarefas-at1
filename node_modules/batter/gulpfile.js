/**
 * Author: Jeff Whelpley
 * Date: 2/9/14
 *
 * Build file for Pancakes
 */
var gulp    = require('gulp');
var taste   = require('taste');
var batter  = require('./lib/batter');

batter.whip(gulp, taste, {
    targetDir:      __dirname,
    unitTargetCode: ['lib/*.js', 'build/*.js']
});
