'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const inject = require('gulp-inject');
const injectString = require('gulp-inject-string');
const argv = require('yargs').argv;
const fs = require('fs');
const map = require('map-stream');
const replace = require('gulp-replace');

const components = [];
const basePath = '../';

if (argv.dirPaths !== undefined) {
	argv.dirPaths.split(',').forEach(dirPath => addComponent(dirPath));
}

function addComponent(dirPath) {
	const segments = dirPath.split('/');
	let compName = '', scssFile = '', tsFile = '';

	if (segments[segments.length - 1] === '') {
		compName = segments[segments.length - 2];
		scssFile = dirPath + compName + '.component.scss';
		tsFile = dirPath + compName + '.component.ts';
	} else {
		compName = segments[segments.length - 1];
		scssFile = dirPath + '/' + compName + '.component.scss';
		tsFile = dirPath + '/' + compName + '.component.ts';
	}
	if (compName !== '' && scssFile !== '' && tsFile !== '') {
		components.push({
			scss: scssFile,
			ts: tsFile
		});
		console.log('SCSS', scssFile);
		console.log('TS', tsFile);
	}
	console.log('Root', argv.root);
}

function getSCSSFiles() {
	return components.map(comp => basePath + comp.scss);
}

function getTSFiles() {
	return components.map(comp => basePath + comp.ts);
}

/*
	Copy livesass.js to assets/livesass
	Dependence: inject
*/
gulp.task('copy', ['inject:js'], function() {
	return gulp.src('./livesass.js')
			.pipe(gulp.dest('../src/assets/livesass'));
});

/*
	Inject livesass.js into index.html
*/
gulp.task('inject:js', function() {
	return gulp.src('../src/index.html')
			.pipe(replace(/<!-- inject:js -->.*<!-- endinject -->/, ''))
            .pipe(replace('</body>', '<!-- inject:js --><!-- endinject --></body>'))
			.pipe(
				inject(
					gulp.src('./livesass.js', {read: false})
						.pipe(gulp.dest('assets/livesass'))
				)
			)
			.pipe(gulp.dest('../src'));
});

/*
	Inject css file into index.html
*/
gulp.task('inject:css', ['compile'], function() {
	return gulp.src('../src/index.html')
            .pipe(replace(/<!-- inject:css -->.*<!-- endinject -->/, ''))
            .pipe(replace('</head>', '<!-- inject:css --><!-- endinject --></head>'))
			.pipe(
				inject(
					gulp.src('../src/assets/livesass/*.css', {read: false})
						.pipe(gulp.dest('assets/livesass'))
				)
			)
			.pipe(gulp.dest('../src'));
});

gulp.task('addselectors', ['copy'], function() {
	const scriptFile = basePath + 'src/assets/livesass/livesass.js';
	return gulp.src(getTSFiles())
		.pipe(map(function(file, callback) {
			var match = file.contents.toString().match(/selector: '(.*)',/i);
			fs.appendFileSync(scriptFile, 'lvs_addSelector(\'' + match[1] + '\');\n');
			callback();
		}));
});

/*
	Define components' selectors
	Dependece: copy
*/
gulp.task('livesass', ['addselectors', 'inject:css'], function() {
	return gulp.src('../src/assets/livesass/livesass.js')
				.pipe(injectString.append('lvs_livesass();'))
				.pipe(gulp.dest('../src/assets/livesass/'));
});

/*
	Compile scss to css
*/
gulp.task('compile', function () {
	return gulp.src(getSCSSFiles())
			.pipe(sourcemaps.init())
			.pipe(sass().on('error', sass.logError))
			.pipe(sourcemaps.mapSources(function(sourcePath, file) {
			    const group = file.base.match(/^\/code(.*)$/);
				return argv.root + group[1] + sourcePath;
			}))
			.pipe(sourcemaps.write({
				includeContent: false,
				sourceRoot: 'file://'
			}))
			.pipe(gulp.dest('../src/assets/livesass'));
});

gulp.task('default', ['livesass'], function() {
	if (components.length > 0) {
		gulp.watch(getSCSSFiles(), ['livesass']);
	} else {
		return 'File not found';
	}
});
