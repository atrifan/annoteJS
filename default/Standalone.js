function Standalone(clazz) {
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
}

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

    clazz[this.name](1,2);
}

function _treatMethod(clazz) {
    var instance;

    console.log("Trying");
    if(clazz[this.parentClass]) {
        instance = new clazz[this.parentClass]();
    } else {
        return;
    }

    instance[this.name]();
}

module.exports = {
    isDecorator: false,
    implementation: Standalone
}