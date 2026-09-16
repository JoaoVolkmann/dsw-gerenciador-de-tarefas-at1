batter
==========

This is a library to help simplify your gulp file. The basic idea is that instead of having
everything in one gulpfile, you break up your tasks into seperate task modules that can be 
re-used among your projects. While you could technically turn these tasks into plugins, the
reality is that you often don't want to go through the overhead and the task may be just
relevant to your project.

You can build your own tasks, but this library contains a set of default pre-built tasks for:

* lint - Currently using jshint (moving to jslint in the future)
* clean - Using the del npm module
* watch
* test - Using the taste library to simplify test related tasks

## Installation

From the command line enter:

```
npm install batter --save-dev
```

The most basic gulpfile would then be:

```
var gulp    = require('gulp');
var taste   = require('taste');
var batter  = require('batter');
var options = {};

batter.whip(gulp, taste, options);
```

## Creating a Task

To create a task, add a directory named 'build' to your project and then add a file called 'task.{name of task}.js'.
Here is an example of a task file for cleaning out a directory:

```
var del = require('del');

module.exports = function (gulp, opts) {
    var distDir = opts.distDir || 'dist';

    // this is the actual gulp task function
    return function (done) {
        del([distDir + '/*'], done);
    };
};
```

## Options

Whatever is passed into the options will be available within any task created. So, the options will change
depending on what tasks you are running. The options used by the default tasks are as follows:

* test
    * unitTestCode
    * apiTestCode
    * extTestCode
    * intTestCode
    * unitTargetCode
    * intTargetCode
    * targetDir
* clean
    * distDir (default 'dist') - Directory containing the built client side resources
* watch
    * watchCode (default concat of unitTestCode and unitTargetCode)
* lint
    * lintCode (default concat of unitTestCode and unitTargetCode)
    
Note that you can either set these options in the object sent into batter.whip() or you can add them at the command
line. At the command line, simply add --{name of option}={value}