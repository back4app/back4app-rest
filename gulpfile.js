'use strict';

var gulp = require('gulp');
var gulpConfig = require('./gulp.config.json');
var paths = gulpConfig.paths;
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var stylish = require('gulp-jscs-stylish');
var mocha = require('gulp-mocha');
var exec = require('child_process').exec;

/**
 * The default task (called when you run `gulp` from cli)
 */
gulp.task('default', ['test']);

/**
 * Task to run complete test for deployment
 */
gulp.task('test', ['dist', 'test-js', 'docs']);

/**
 * Task to generate dist build
 */
gulp.task('dist', ['clean:dist'], function () {
  // dummy dist task
});

/**
 * Task to clean dist folder
 */
gulp.task('clean:dist', function () {
  // dummy clean:dist task
});

/**
 * Task to run all linters and tests
 */
gulp.task('test-js', ['lint', 'mocha']);

/**
 * Task to run link checks
 */
gulp.task('lint', function () {
  var noop = function () {};

  return gulp.src(paths.lintCheckFiles)
    .pipe(jshint())
    .pipe(jscs())
    .on('error', noop)
    .pipe(stylish.combineWithHintResults())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

/**
 * Task to run mocha tests
 */
gulp.task('mocha', function () {
  return gulp.src(paths.mochaSrc, {read: false})
    .pipe(mocha({
      reporter: 'spec'
    }));
});

/**
 * Task to create docs
 */
gulp.task('docs', ['docs:back', 'docs:guide']);

/**
 * Task to create back docs
 */
gulp.task('docs:back', function () {
  exec(
    './node_modules/jsdoc/jsdoc.js ' +
    '-d ' + paths.backDocsDist + ' ' +
    '-r ' + paths.backDocsSrc + ' ' +
    '--private',
    function (err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
    }
  );
});

/**
 * Task to create guide docs
 */
gulp.task('docs:guide', function () {
  exec(
    './node_modules/jsdoc/jsdoc.js ' +
    '-u ' + paths.guideDocsSrc + ' ' +
    '-d ' + paths.guideDocsDist + ' ' +
    '-r ' + paths.guideDocsSrc,
    function (err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
    }
  );
});
