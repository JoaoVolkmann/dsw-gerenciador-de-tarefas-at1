/**
 * Author: Jeff Whelpley
 * Date: 1/20/15
 *
 * Interface file for the batter module
 */
var _           = require('lodash');
var argv        = require('yargs').argv;
var fs          = require('fs');
var path        = require('path');
var delim       = path.normalize('/');
var taskRegex   = /^task\.(.*)\.js$/;

/**
 * Set options defaults that are used for batter tasks
 * @param opts Object with options for batter
 * @returns {*|{}}
 */
function getOptions(opts) {
    opts = opts || {};

    // command line arguments override options
    _.extend(opts, argv);
    delete opts.$0;
    delete opts._;

    // these values are used in multiple tasks, so set defaults here
    opts.unitTestCode = opts.unitTestCode || 'test/unit/**/*.js';
    opts.unitTargetCode = opts.unitTargetCode || 'lib/**/*.js';
    opts.testDir = opts.testDir || 'test';
    opts.rootDir = opts.rootDir || process.cwd();
    opts.targetDir = opts.targetDir || (opts.rootDir + '/lib');
    opts.tasksets = _.extend({ 'default': ['lint', 'test'] }, opts.tasksets);

    return opts;
}

/**
 * Helper function to get the plugins for which we will look for tasks
 * @param opts
 */
function getPlugins(opts) {
    var batterRootDir = __dirname.replace(delim + 'lib', '');
    var batterTasks = { rootDir: batterRootDir };
    var currentProject = { rootDir: opts.rootDir };
    var plugins = opts.plugins || [];

    // tasks in batter go to the front of the list; current project at the end (i.e. most important)
    plugins.unshift(batterTasks);

    if (batterRootDir !== opts.rootDir) {
        plugins.push(currentProject);
    }

    return plugins;
}

/**
 * Whip up tasks by adding them to gulpkl
 * @param gulp
 * @param taste
 * @param opts
 */
function whip(gulp, taste, opts) {
    opts = getOptions(opts);
    opts.taste = taste;

    var tasks = _.extend({}, opts.tasksets);

    // loop through plugins so we can get tasks from them
    _.each(getPlugins(opts), function (plugin) {
        var pluginRoot = plugin.rootDir;
        var pluginBuildDir = pluginRoot + delim + 'build';

        // look through files in the plugin build directory to try and find tasks
        if (fs.existsSync(pluginBuildDir)) {
            _.each(fs.readdirSync(pluginBuildDir), function (pluginFile) {
                var taskName, task;

                // if the file name starts with 'task.' then it is a task file
                if (taskRegex.test(pluginFile)) {

                    // the task name is the middle part of the file name (i.e. blah for task.blah.js)
                    taskName = pluginFile.match(taskRegex)[1];
                    task = require(pluginBuildDir + delim + pluginFile)(gulp, opts);

                    // if task is function or an object with deps and task
                    if (_.isFunction(task) || (task.deps && task.task)) {
                        tasks[taskName] = task;
                    }
                    // else if it's an object, then there are subtasks
                    else if (_.isObject(task)) {
                        _.each(task, function (subtask, subtaskName) {
                            var fullTaskName = subtaskName === '' ? taskName : taskName + '.' + subtaskName;
                            tasks[fullTaskName] = subtask;
                        });
                    }
                    else {
                        throw new Error(pluginBuildDir + delim + pluginFile + ' is invalid');
                    }
                }
            });
        }
    });

    // now we have all the tasks in an object so let's add them to gulp
    _.each(tasks, function (task, taskName) {
        if (_.isFunction(task) || _.isArray(task)) {
            gulp.task(taskName, task);
        }
        else if (task.deps && task.task) {
            gulp.task(taskName, task.deps, task.task);
        }
        else {
            throw new Error('Invalid task for ' + taskName);
        }
    });
}

// export whip to be used in every gulpfile
module.exports = {
    getOptions: getOptions,
    getPlugins: getPlugins,
    whip: whip
};
