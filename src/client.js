/*global exports */
/*global process */
/*eslint-env es6, node*/
/*eslint max-len: ["error", { "code": 200 }]*/
"use strict";

var LanguageClient = require(global.LanguageClientInfo.languageClientPath).LanguageClient,
    net = require("net"),
    cp = require("child_process"),
    execa = require("execa"),
    semver = require('semver'),
    clientName = "PhpActorClient",
    executablePath = "";

function validatePhpExecutable(confParams) {
    executablePath = confParams["executablePath"] ||
        (process.platform === 'win32' ? 'php.exe' : 'php');

    return new Promise(function (resolve, reject) {
        execa.stdout(executablePath, ['--version']).then(function (output) {
            var matchStr = output.match(/^PHP ([^\s]+)/m);
            if (!matchStr) {
                reject("PHP_VERSION_INVALID");
                return;
            }
            var version = matchStr[1].split('-')[0];
            if (!/^\d+.\d+.\d+$/.test(version)) {
                version = version.replace(/(\d+.\d+.\d+)/, '$1-');
            }
            if (semver.lt(version, '7.4.0')) {
                reject(["PHP_UNSUPPORTED_VERSION", version]);
                return;
            }
            resolve();
        }).catch(function (err) {
            if (err.code === 'ENOENT') {
                reject("PHP_EXECUTABLE_NOT_FOUND");
            } else {
                reject(["PHP_PROCESS_SPAWN_ERROR", err.code]);
                console.error(err);
            }
            return;
        });
    });
}
var serverOptions = function () {
    return new Promise(function (resolve, reject) {
        var serverProcess = cp.spawn(executablePath, [
            __dirname + "/vendor/bin/phpactor",
            "language-server"
        ]);
 
        if (serverProcess && serverProcess.pid) {
            resolve({
                process: serverProcess
            });
        } else {
            reject("Couldn't create server process");
        }
    });
},
options = {
    serverOptions: serverOptions
};

function init(domainManager) {
    var client = new LanguageClient(clientName, domainManager, options);
    client.addOnRequestHandler('validatePhpExecutable', validatePhpExecutable);
}

exports.init = init;
