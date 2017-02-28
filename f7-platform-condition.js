var fs = require('fs');
var path = require('path');
module.exports = function (ctx) {
    var projectRoot = ctx.opts.projectRoot;
    var walk = function(dir) {
        var results = [];
        var list = fs.readdirSync(dir);
        list.forEach(function(file) {
            file = dir + '/' + file;
            var stat = fs.statSync(file);
            if (stat && stat.isDirectory()) results = results.concat(walk(file));
            else results.push(file);
        });
        return results;
    };
    var iosFiles = fs.existsSync(path.join(projectRoot, 'platforms/ios/www')) ? walk(path.join(projectRoot, 'platforms/ios/www')) : [];
    var androidFiles = fs.existsSync(path.join(projectRoot, 'platforms/android/assets/www')) ? walk(path.join(projectRoot, 'platforms/android/assets/www')) : [];
    var filesToProcess = [];
    iosFiles.concat(androidFiles).forEach(function(filename) {
        if (path.extname(filename) === '.html') filesToProcess.push(filename);
    });
    // Conditions
    filesToProcess.forEach(function (filename) {
        var isIos = filename.indexOf('platforms/ios/') >= 0;
        var isAndroid = filename.indexOf('platforms/android/') >= 0;
        if (!fs.existsSync(filename)) return;
        var fileContent = fs.readFileSync(filename, 'utf-8');
        var conditions;

        var finalContent = '';
        if (isIos) {
            conditions = fileContent.split('<!-- @f7-if-android -->');
            if (conditions.length === 1) return;
            conditions.forEach(function (str) {
                if (str.indexOf('<!-- @f7-endif-android -->') >= 0) {
                    finalContent += str.split('<!-- @f7-endif-android -->')[1];
                }
                else {
                    finalContent += str;
                }
            });

        }
        else {
            conditions = fileContent.split('<!-- @f7-if-ios -->');
            if (conditions.length === 1) return;
            conditions.forEach(function (str) {
                if (str.indexOf('<!-- @f7-endif-ios -->') >= 0) {
                    finalContent += str.split('<!-- @f7-endif-ios -->')[1];
                }
                else {
                    finalContent += str;
                }
            });
        }
        finalContent = finalContent
            .replace(/<!-- @f7-if-ios -->/g, '')
            .replace(/<!-- @f7-endif-ios -->/g, '')
            .replace(/<!-- @f7-if-android -->/g, '')
            .replace(/<!-- @f7-endif-android -->/g, '');

        fs.writeFileSync(filename, finalContent);
    });
    // Includes
    filesToProcess.forEach(function (filename) {
        var isIos = filename.indexOf('platforms/ios/') >= 0;
        var isAndroid = filename.indexOf('platforms/android/') >= 0;
        if (!fs.existsSync(filename)) return;
        var fileContent = fs.readFileSync(filename, 'utf-8');
        var parts = fileContent.split(/(<!-- @f7-include[-a-z]* "[a-zA-Z0-9-_.\/]*" -->)/);
        if (parts.length === 0 || parts.length === 1) return;
        var finalContent = '';
        parts.forEach(function (part) {
            if (part.indexOf('<!-- @f7-include') < 0) {
                finalContent += part;
                return;
            }
            if (part.indexOf('<!-- @f7-include-ios') >= 0 && !isIos) return;
            if (part.indexOf('<!-- @f7-include-android') >= 0 && !isAndroid) return;
            var includePath = part.split('"')[1].split('"')[0];
            var includeFilePath = path.resolve(path.dirname(filename), includePath);
            finalContent += fs.readFileSync(includeFilePath, 'utf-8');
        });
        fs.writeFileSync(filename, finalContent);
    });
};