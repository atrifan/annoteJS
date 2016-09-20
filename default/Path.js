var path = require('path'),
    util = require('util'),
    controllerRouter = require(path.resolve(process.cwd(), './lib/controller_router')).get();

//TODO: should be able to support path params latter get /router/{variableName}/something

function implementation(clazz) {
    if(this.type == 'class') {
        try {
            _treatClass.call(this, clazz);
        } catch (ex) {
            throw ex;
        }
    } else {
        try {
            _treatMethod.call(this, clazz);
        } catch (ex) {
            throw ex;
        }
    }
};

function _treatClass(clazz) {
    var controllerPath = implementation.defaultArgument.replace(/"/g, ""),
        resolvedPath = _resolvePath(controllerPath, this);

    var isClass = false;
    for(var element in clazz[this.name].prototype) {
        if(element != 'constructor' && element != '__proto__') {
            isClass = true;
            break;
        }
    }

    //if it is class instantiate it and put info on it
    clazz[this.name].path = resolvedPath;
    clazz[this.name].basePath = resolvedPath;

    if(isClass) {
        return;
    }

    //controllerPath is with something from me
    var routingData = {
        path: resolvedPath,
        componentId: resolvedPath.split('/')[1],
        version: resolvedPath.split('/')[2]
    };

    controllerRouter.registerRoute(routingData);

    return clazz;
}

function _treatMethod(clazz) {
    var controllerPath = implementation.defaultArgument.replace(/"/g, ""),
        resolvedPath = _resolvePath(controllerPath, this);

    var instance;
    if(clazz[this.parentClass]) {
        if(!clazz[this.parentClass].basePath) {
            clazz[this.parentClass].path = resolvedPath;
            clazz[this.parentClass].basePath = resolvedPath;
        } else {
            clazz[this.parentClass].path = clazz[this.parentClass].basePath + controllerPath;
        }
    } else {
        return;
    }


    var routingData = {
        path: clazz[this.parentClass].path
    };

    controllerRouter.registerRoute(routingData);
}

function _resolvePath(declaredPath, context) {
    var file = context.originalFile ? context.originalFile : context.file,
        splittedLocation = file.split('server'),
        component = path.basename(splittedLocation[0]),
        destination = declaredPath == '/' ? '/' + path.basename(file).replace('.js', '') :
            declaredPath;

    return util.format("/%s/controller%s", component, destination.replace('.js', ''));
}

module.exports = {
    implementation: implementation,
    isDecorator: false
};