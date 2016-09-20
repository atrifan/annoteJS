'use strict';

var fs = require('fs'),
    vm = require('vm'),
    path = require('path'),
    assert = require('assert'),
    Module = require('module'),
    Compiler = require('./compiler'),
    logging = {
        debug: console.log,
        info: console.info,
        error: console.error,
        fatal: console.error
    };

function ModuleLoader() {
    this._registerDefaultAnnotations();
    this._cache = {};
}

ModuleLoader._uncacheableModules = ['compiler'];

ModuleLoader.prototype._registerDefaultAnnotations = function() {
    ModuleLoader.registerAnnotations(path.resolve(__dirname, './default'));
};

ModuleLoader.registerLogger = function(logger) {
    logging = logger;
};

ModuleLoader.registerAnnotations = function(absolutePathToLocation) {
    var stats = fs.statSync(absolutePathToLocation);
    if(!fs.existsSync(absolutePathToLocation) || !stats.isDirectory()) {
        throw new Exception(util.format("%s location does not exist or is not a directory", absolutePathToLocation));
    }

    var files = fs.readdirSync(absolutePathToLocation);
    files.forEach(function(val) {
        ModuleLoader._registerFile(absolutePathToLocation, val);
    })
};

ModuleLoader._registerFile = function(origin, file) {
    var fileLocation = path.resolve(origin, file);
    if(fs.statSync(fileLocation).isDirectory()) {
        var files = fs.readdirSync(fileLocation);
        files.forEach(function(val) {
            ModuleLoader._registerFile(fileLocation, val);
        })
    } else {
        ModuleLoader._uncacheableModules.push(fileLocation.replace('.js', ""));
        Compiler.registerAnnotation(file, fileLocation);
    }
};

ModuleLoader.prototype.requireWithAnnotations = function (filename, component, locale, presetScript, originalFile) {
    if(!component) {
        component = {
            id: null,
            version: null
        }
    }

    var toRequire;


    if(path.extname(filename) !== '.js') {
        toRequire = filename + '.js';
    } else {
        toRequire = filename;
    }

    var id = (originalFile ? originalFile : filename).replace('.js', '') + ':' + component.id + ';' + component.version + ':' + locale,
        module = this._cache[id];

    if (!module) {
        module = new Module(filename);
        module.filename = filename;
        module.paths = Module._nodeModulePaths(path.dirname(filename));

        var script = presetScript ? presetScript : this._compile(toRequire),
            customRequire = this._makeCustomRequire(module, component, locale),
            context = this._generateContext(component, locale);

        // The this keyword points to module.exports inside the module.
        // The first five parameters are the same with the ones provided by Node's module
        // system: exports, require, module, __filename, __dirname.
        script.call(module.exports,
            module.exports, customRequire, module, filename, path.dirname(filename),
            context.logger);

        module.loaded = true;

        var dontCache = false;
        ModuleLoader._uncacheableModules.forEach(function(module) {
            if(filename.indexOf(module) != -1) {
                dontCache = true;
            }
        });

        if(!dontCache) {
            this._cache[id] = module;
        }
    }

    return module.exports;
};

/**
 * Compiles the module to be loaded using the ``vm`` module.
 *
 * @param {String} filename the absolute file path for the module.
 * @param [{String}] originalFile the file that inherits filename
 * @returns {Function} the wrapper function
 */
ModuleLoader.prototype._compile = function (filename, originalFile) {
    var content = fs.readFileSync(filename, 'utf8');

    // remove shebang
    content = content.replace(/^#!.*/, '');

    return vm.runInThisContext(this._wrap(content, filename, originalFile), originalFile ? originalFile : filename);
};

ModuleLoader.prototype.runWithAnnotations = function(code, filename, originalFile) {
    var script = vm.runInThisContext(this._wrap(code, filename, originalFile), originalFile ? originalFile : filename);
    return this.requireWithAnnotations(filename, undefined, undefined, script, originalFile);
};

/**
 * Wraps the module's code into an anonymous function.
 *
 * @param {String} content the content of the module
 * @returns {String}
 */
ModuleLoader.prototype._wrap = function (content, file, fileToCompile) {
    var compiler = new Compiler();
        compiler.setLoader(this);

    try {
        var data = '(function (exports, require, module, __filename, __dirname, logger) {\n' +
            compiler.compileModule(content, file, fileToCompile) + '\n});';
        return data;
    } catch(ex) {
        console.log("failure on ", file, content);
        throw ex;
    }
};

/**
 * Constructs a custom require to be used by the loaded module. It uses this custom module loader
 * to load sub-modules belonging to the same component. Node's require is used for core modules,
 * modules located in ``node_modules`` folder and modules with another extension than ``.js``.
 *
 * @param {Module} module the module from where the sub-module is requested.
 * @param {Object} component
 * @param {String} locale
 * @returns {Object} the exports object of the loaded module
 * @private
 */

ModuleLoader.prototype._makeCustomRequire = function (module, component, locale) {
    var dirname = path.dirname(module.filename),
        self = this;

    return function (request) {
        if (request.indexOf('./') === 0 || request.indexOf('../') === 0) {
            var modulePath = path.resolve(dirname, request);
            if(path.extname((request)) == '.json') {
                return module.require(modulePath);
            } else if(path.basename(request).replace('.js', '') == 'module_loader') {
                return module.require(modulePath);
            }
            return self.requireWithAnnotations(modulePath, component, locale);
        } else if(request[0] === '/' || (request[1] === ':' && request[2] === '\\')){
            if(path.basename(request).replace('.js', '') == 'module_loader') {
                return module.require(request);
            }else if(path.extname(request) == '.json') {
                return module.require(request);
            } else if(fs.existsSync(path.dirname(request))) {
                return self.requireWithAnnotations(request, component, locale);
            } else {
                return module.require(request);
            }
        }

        return module.require(request);
    };
};

ModuleLoader.prototype._generateContext = function (component, locale) {
    var context = {};
    context.logger = logging;
    return context;
};

/**
 * Singleton instance.
 *
 * @type {ModuleLoader}
 * @private
 */
ModuleLoader._instance = null;

/**
 * Gets the singleton instance.
 *
 * @returns {ModuleLoader}
 */
ModuleLoader.get = function () {
    if (!ModuleLoader._instance) {
        ModuleLoader._instance = new ModuleLoader();
    }

    return ModuleLoader._instance;
};

module.exports = ModuleLoader;