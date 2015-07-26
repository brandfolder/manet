"use strict";

var _ = require('lodash'),
    fs = require('fs-extra'),
    logger = require('winston'),
    path = require('path'),
    squirrel = require('squirrel'),
    utils = require('./utils'),
    gm = require('gm'),

    SCRIPT_FILE = 'scripts/screenshot.js',

    DEF_ENGINE = 'slimerjs',
    DEF_COMMAND = 'slimerjs',
    DEF_FORMAT = 'png';


/* Configurations and options */

function outputFile(options, conf, base64) {
    var format = options.format || DEF_FORMAT;
    return conf.storage + path.sep + base64 + '.' + format;
}

function cliCommand(config) {
    var engine = config.engine || DEF_ENGINE,
        command = config.command || config.commands[engine][process.platform];
    return command || DEF_COMMAND;
}

function cleanupOptions(options, config) {
    var opts = _.omit(options, ['force', 'callback']);
    opts.url = utils.fixUrl(options.url);
    return _.defaults(opts, config.options);
}


/* Image processing */

function minimizeImage(src, dest, cb) {
    var iminModules = [
        'imagemin',
        'imagemin-gifsicle',
        'imagemin-jpegtran',
        'imagemin-optipng',
        'imagemin-svgo'
    ];

    squirrel(iminModules, function(err, Imagemin) {
        var safeCb = function (err) {
            if (err) {
                logger.error(err);
            }
            cb();
        };

        if (err) {
            safeCb(err);
        } else {
            var imin = new Imagemin()
                .src(src)
                .dest(dest)
                .use(Imagemin.jpegtran({progressive: true}))
                .use(Imagemin.optipng({optimizationLevel: 3}))
                .use(Imagemin.gifsicle({interlaced: true}))
                .use(Imagemin.svgo());

            imin.run(safeCb);
        }
    });
}


/* Screenshot capturing runner */

function runCapturingProcess(options, config, outputFile, base64, onFinish) {
    var scriptFile = utils.filePath(SCRIPT_FILE),
        command = cliCommand(config).split(/[ ]+/),
        cmd = _.union(command, [scriptFile, base64, outputFile]),
        opts = {
            timeout: config.timeout
        };

    logger.debug('Options for script: %s, base64: %s', JSON.stringify(options), base64);

    utils.execProcess(cmd, opts, function(error) {
        if (config.compress) {
            minimizeImage(outputFile, config.storage, function() {
                onFinish(error);
            });
        } else {
            onFinish(error);
        }
    });
}


/* External API */

function screenshot(options, config, onFinish) {
    var opts = cleanupOptions(options, config),
        base64 = utils.encodeBase64(opts),
        file = outputFile(opts, config, base64),
        result,

        retrieveImageFromStorage = function () {
            var error = null;
            logger.debug('Take screenshot from file storage: %s', base64);
            if (options.resizeToWidth){
                var resizedFile = path.dirname(file) + '/' + path.basename(file, path.extname(file)) + '-' + options.resizeToWidth + path.extname(file);
                return gm(file)
                    .resize(options.resizeToWidth)
                    .write(resizedFile, function (err) {
                      if (err) { error = err };
                      onFinish(resizedFile, error);
                    });
            } else {
                return onFinish(file, error);
            }
        },
        retrieveImageFromSite = function () {
            runCapturingProcess(opts, config, file, base64, function (error) {
                logger.debug('Process finished work: %s', base64);
                if (options.resizeToWidth){
                    var resizedFile = path.dirname(file) + '/' + path.basename(file, path.extname(file)) + '-' + options.resizeToWidth + path.extname(file);
                    return gm(file)
                        .resize(options.resizeToWidth)
                        .write(resizedFile, function (err) {
                          if (err) { error = err };
                          onFinish(resizedFile, error);
                        });
                } else {
                    return onFinish(file, error);
                }
            });
        };

    logger.info('Capture site screenshot: %s', options.url);

    if (options.force || !config.cache) {
        retrieveImageFromSite();
    } else {
        fs.exists(file, function (exists) {
            if (exists) {
                retrieveImageFromStorage();
            } else {
                retrieveImageFromSite();
            }
        });
    }
}


/* Exported functions */

module.exports = {
    screenshot: screenshot
};
