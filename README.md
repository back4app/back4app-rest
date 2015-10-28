back4app rest
=======================

[![Build Status](
    http://jenkins.back4app.com:8080/buildStatus/icon?job=back4app-rest%20-%20master)](
    http://jenkins.back4app.com:8080/job/back4app-rest%20-%20master/)

## Table of contents

* [Getting Started] (#getting-started)
* [Dependencies] (#dependencies)
* [Gulp] (#gulp)
* [Building Files] (#building-files)
* [Best Practices] (#best-practices)

### Getting Started

First of all, you need to install Node.js. To help you to manage different
version of Node.js in your system is recommended that you use nvm. nvm is a
Node.js version manager. Using it you will be able to have how many Node.js
versions you want. To install it run this command:

```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.25.4/install.sh | bash
```

or

```
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.25.4/install.sh | bash
```

To enable the nvm, close and reopen the terminal.
Now you can install the most recent stable version of Node.js. To do this just
run this command:

```
nvm install stable
```

For further information about nvm check its [repository](
https://github.com/creationix/nvm).

### Dependencies

First ensure that you have installed [node.js](https://nodejs.org/en/) ands
[mongodb](https://www.mongodb.org/downloads). Then

```
$ npm install
```

####Possible errors

May be caused by the default node version in your machine. To set the default node in
your shell, run this command:

```
nvm alias default 4.0.0
```

Then verify the change persists by closing the shell window, reopening it and running:

```
node --version
```

### Gulp

Gulp is included on Development Dependencies. Running the previous command might install it.
To install gulp you should run this command:

```
npm install gulp --global
```

#### Gulp Tasks

##### injectindex

During development, the results can be visualized on a static web page.
In order to keep it updated, this task injects the .js and .css files on index.html

It uses the `gulp-inject` package to and reads the `gulp.config.json` file.


##### lint

This task is used to maintain the established standards on code style and avoid syntax errors.
  
It uses `gulp-jshint` and `gulp-jscs`.


##### test

This task does unit and interface tests. Those are two subtasks, that can be called separately.

It uses `karma` and `selenium`, through `gulp-mocha` and `browser-sync`.


##### dist

To generate the production files, this task concatenates and minifies the development files.
It depends on lint task, and it runs unit tests on the minified files.

It uses `gulp-concat` and `gulp-uglify`.


### Building files

Contributing with the project, you can build the production files by running the Gulp Task `dist`.
It will create the "dist" directory. All dependencies and minified files will be injected on the production web page.
 
To run this task, use the following command:

```
gulp dist
```

### Best Practices

* You should follow the configuration files, using it on your IDE.
They're `.editorconfig`, `.jscsrc` and `.jshintrc`.

* Try to always remember to run lint and tests:
```
gulp lint
gulp test
```
* Create tests to any new major interactions, or changed ones.

* Follow the code comment standards for documentations.
