var path = require('path'),
    controllerRouter = require(path.resolve(process.cwd(), './lib/controller_router')).get(),
    util = require('util');


function implementation(clazz) {
    if(this.type == 'class') {
        _treatClass.call(this, clazz);
    } else {
        _treatMethod.call(this, clazz)
    }
};

function _treatClass(clazz) {
    var isClass = false;

    for(var element in clazz[this.name].prototype) {
        if(element != 'constructor' && element != '__proto__') {
            isClass = true;
            break;
        }
    }

    //if it is class instantiate it and put info on it
    if(isClass) {
        return;
    }

    if(!clazz[this.name].path) {
        clazz[this.name].path = _resolvePath(this);
    }

    //controllerPath is with something from me
    var routingData = {
        path: clazz[this.name].path,
        method: 'POST',
        handler: clazz[this.name]
    };

    controllerRouter.registerRoute(routingData);
}

function _treatMethod(clazz) {
    var myPath = _resolvePath(this),
        instance;

    if(clazz[this.parentClass]) {
        if(!clazz[this.parentClass].path) {
            clazz[this.parentClass].path = clazz[this.parentClass].basePath || myPath;
        }

        instance = new clazz[this.parentClass]();
    }

    var routingData = {
        path: clazz[this.parentClass].path,
        method: 'POST',
        handler: instance[this.name].bind(instance)
    };

    delete clazz[this.parentClass].path;
    controllerRouter.registerRoute(routingData);
}

function _resolvePath(context) {
    var file = context.originalFile ? context.originalFile : context.file,
        splittedLocation = file.split('server'),
        component = path.basename(splittedLocation[0]),
        destination = path.basename(file);

    return util.format("/%s/controller/%s", component, destination.replace('.js', ''));
}

module.exports = {
    implementation: implementation,
    isDecorator: false
};