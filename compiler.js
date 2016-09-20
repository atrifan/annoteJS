var esprima = require('esprima'),
    Lexer = require('lex'),
    util = require('util'),
    escodegen = require('escodegen'),
    Module = require('module'),
    path = require('path');

function Compiler() {
    this._lexer = new Lexer();
    this._addAnnotationRules();
    this._annotationMap = {};
}

Compiler._annotations = {};

Compiler.registerAnnotation = function(annotationName, location) {
    console.info(util.format("Register annotations @%s from location %s", path.basename(annotationName, '.js'),
        location));
    Compiler._annotations[annotationName] = location;
}

Compiler.prototype.setLoader = function(moduleLoader) {
    this._moduleLoader = moduleLoader;
}

Compiler.prototype._addAnnotationRules = function() {
    var self = this;
    this._lexer.addRule(/\s/, function() {

    });
    this._lexer.addRule(/@([^\(\)]*)(?:(?:\()([^\)]*)?(?:\))?)?[\n\r]{1}/i, function(text) {
        var annotationName = arguments[1].trim(),
            annotationArguments = arguments[2] ? arguments[2].split(',') : [];

        self._moduleData = self._moduleData.replace(text, 'function ' + annotationName + '(){}\n');
        var moduleFunction = self._moduleLoader.requireWithAnnotations(Compiler._annotations[annotationName]);

        annotationArguments.forEach(function(argument) {
            var keyValue = argument.split("=");
            if(keyValue.length == 1) {
                moduleFunction.implementation.defaultArgument = keyValue[0];
            } else {
                moduleFunction.implementation[keyValue[0].trim()] = keyValue[1].trim();
            }
        });

        if(!self._annotationMap[annotationName]) {
            self._annotationMap[annotationName] = [moduleFunction];
        } else {
            self._annotationMap[annotationName].push(moduleFunction);
        }

    });
    this._lexer.addRule(/.*/g, function() {

    });
};

Compiler.prototype.compileModule = function(fileData, fileName, originalFile) {
    var self = this;

    this._moduleData = fileData;

    this._lexer.setInput(this._moduleData);
    this._lexer.lex();

    var syntax;
    try {
        syntax = esprima.parse(this._moduleData);
    } catch(ex) {
        throw ex;
    }


    var toBeUsed = [],
        toRemove = [],
        toCall = [];

    var id = 0;

    syntax.body.forEach(function(elem, index) {
        if(elem.type == 'FunctionDeclaration') {
            var elemName = elem.id.name;
            if(self._annotationMap[elemName]) {
                for(var i = 0; i < self._annotationMap[elemName].length; i++) {
                    if(!self._annotationMap[elemName][i].visited) {
                        self._annotationMap[elemName][i].visited = true;
                        toBeUsed.push(self._annotationMap[elemName][i]);
                        break;
                    }
                }
                toRemove.push(index);
            } else {
                var oldParms = elem.params,
                    oldBody = elem.body;
                if(toBeUsed.length > 0) {
                    //useThem
                    var firstDecorator = 0;
                    toBeUsed.forEach(function(proxyCall, index) {
                        if(!proxyCall.isDecorator) {
                            toCall.push({
                                what: proxyCall.implementation,
                                type: 'class',
                                name: elem.id.name,
                                file: fileName,
                                originalFile: originalFile ? originalFile : fileName
                            });

                            return;
                        }
                        if(firstDecorator == 0) {
                            //change the body
                            elem.body = esprima.parse("function randomFunction() { var deferrers = [];}").body[0].body;
                            firstDecorator++;
                        }

                        var remakeFunction = esprima.parse(util.format('var fn = function() {}'));

                        //make a callback function that is the original function
                        remakeFunction.body[0].declarations[0].init.params = oldParms;
                        remakeFunction.body[0].declarations[0].init.body = oldBody;

                        //proxy
                        var proxyParsed = esprima.parse(proxyCall.implementation);
                        //add the callback from above before the current code
                        var theProxy = esprima.parse(util.format('var myVar_%s=function() {}', id));
                        proxyParsed.body[0].body.body.unshift(remakeFunction);
                        theProxy.body[0].declarations[0].init.body = proxyParsed.body[0].body;

                        var insertion = esprima.parse(util.format('%s var theArguments = Array.apply(null, arguments);' +
                            ' deferrers.push(myVar_%s.bind(this, theArguments));',
                            escodegen.generate(theProxy), id++));
                        //push them all;
                        elem.body.body.push(insertion);
                    });
                    if(firstDecorator > 0) {
                        elem.body.body.push(esprima.parse("function randomFunction() {return Promise.seq(deferrers); }").body[0].body.body[0]);
                    }
                    toBeUsed = [];
                }
            }
        } else {
            if (elem.type == 'ExpressionStatement' && elem.expression.operator == '=' &&
                elem.expression.right.type == 'FunctionExpression') {
                var oldParms =  elem.expression.right.params,
                    oldBody =  elem.expression.right.body;
                if(toBeUsed.length > 0) {
                    //useThem
                    var firstDecorator = 0;
                    toBeUsed.forEach(function(proxyCall, index) {
                        if(!proxyCall.isDecorator) {
                            toCall.push({
                                what: proxyCall.implementation,
                                type: 'method',
                                parentClass: elem.expression.left.object.object.name,
                                name: elem.expression.left.property.name,
                                file: fileName,
                                originalFile: originalFile ? originalFile : fileName
                            });
                            return;
                        }

                        if(firstDecorator == 0) {
                            //change the body
                            firstDecorator++;
                            elem.expression.right.body = esprima.parse("function randomFunction() {var deferrers = []; }").body[0].body;
                        }

                        var remakeFunction = esprima.parse(util.format('var fn = function() {}'));

                        //make a callback function that is the original function
                        remakeFunction.body[0].declarations[0].init.params = oldParms;
                        remakeFunction.body[0].declarations[0].init.body = oldBody;

                        //proxy
                        var proxyParsed = esprima.parse(proxyCall.implementation);
                        //add the callback from above before the current code
                        var theProxy = esprima.parse(util.format('var myVar_%s=function() {}', id));
                        proxyParsed.body[0].body.body.unshift(remakeFunction);
                        theProxy.body[0].declarations[0].init.body = proxyParsed.body[0].body;

                        var insertion = esprima.parse(util.format('%s var theArguments = Array.apply(null, arguments);' +
                            '  theArguments.push("%s"); deferrers.push(myVar_%s.bind(this, theArguments));',
                            escodegen.generate(theProxy), elem.expression.left.property.name, id++));
                        //push them all;
                        elem.expression.right.body.body.push(insertion);
                    });
                    if(firstDecorator > 0) {
                        elem.expression.right.body.body.push(esprima.parse("function randomFunction() {return Promise.seq(deferrers); }").body[0].body.body[0]);
                    }
                    toBeUsed = [];
                }
            }
        }
    });


    var howMany = 0;
    for(var i = 0; i < toRemove.length; i++) {
        syntax.body.splice(toRemove[i] - (howMany++), 1);
    }

    var data = escodegen.generate(syntax);

    var moduleInstance;
    toCall.forEach(function(callee, index) {
        try {
            if(index == 0) {
                try {
                    moduleInstance = self._moduleLoader.runWithAnnotations(data, callee.file, callee.originalFile);
                    callee.what.call(callee, moduleInstance);
                }catch (ex){
                    throw ex;
                }
            } else {
                try {
                    callee.what.call(callee, moduleInstance);
                }catch(ex) {
                    throw ex;
                }
            }
        } catch (ex) {
            throw ex;
        }
    });

    return data;
};

module.exports = Compiler;
