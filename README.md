# AnnoteJS Framework - annotations support framework 

**Git: [github](https://github.com/atrifan/annoteJS)**

## Table of Contents

* [Installation](#installation)
* [Writing your own annotations](#writing-your-own-annotations)
  * [Example of annotations](#example-of-annotations)
* [Using the annotations](#using-the-annotations)
  * [Naming](#naming)
  * [Registering](#registering)
  * [Writing an annotated module](#writing-an-annotated-module)
  * [Using the annotated module](#using-the-annotated-module)
  * [Annotation variables](#annotation-variables)

## Installation

`npm install annoteJS`

**This installs in your projects location the _promised-io_ module**

## Writing your own annotations

There are two types of annotation types supported:

1. **Decorator** means that this type of annotation proxies the request through the annotation function and afterwards based on the annotation's implementation 
it calls or not the original function.
2. **NonDecorator** means that the annotation is called first before instantiating the annotated class so it can decide what it should do with the specified 
class. In general we use this type of annotations if we don't intend to later use the annotated modules as standalone. For example a routing annotation does this.

After you have written down your annotation always keep in mind to do the following and this is very **strict**:

```
    module.exports = {
        isDecorator: false,
        implementation: Standalone
    }
```


The above module.exports is standard for your written annotations and should contain the following info:

* **isDecorator** - having true/false value - specifies if it should be a proxy and injected around the code or is a standalone that runs before the annotated module itself.
* **implementation** - the value of this is the actual implementation of the annotation - it should not be a class for that it is called as a function

### Example of annotations

In this section the two types of annotations supported are presented with some particularities and an implementation example. You can also find this implementations
in the packages default annotations.

#### NonDecorator annotation

The following code shows how to write your own annotation of type **NonDecorator**. The **NonDecorator** annotation supports figuring out if your annotation is above a **class**
or above a **method** so you are able to know if you have to instantiate the class or just use the method.

**For NonDecorator annotations _this_ object is the annotation's implementation _this_**

In the implementation method you will receive an object with the following properties:

* **what** - the annotation implementation in string format
* **type** - _method_|_class_ depending on the case. Keep in mind that class applies also for standalone functions - as stated in the below code
* **name** - the name of the class/method/function
* **file** - the file of the annotated module's implementation
* **originalFile** - the original file on this of the annotated module's implementation
* **parentClass** - _[optional]_ - this field is received only on class methods in order to be able to instantiate the main class before running the method name

```
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

```


#### Decorator Annotations

The following code shows how to write your own annotation of type **Decorator**. The **Decorator** annotation can be used over a class or over a method. What happens is
that your annotation implementation will get injected inside the function and get executed first so you can then trigger the actual implementation's call before your operations or after
or anyway around, being also able to change the return of the function. I don't recommend changing the return of the function for that can get very misleading.

**For Decorator annotations _this_ object is the classe's/function's/method's _this_**

In the implementation method you will receive the same arguments as the original function. Also you will have a **fn** variable available in your annotation's implementation so you
can later call the original function. Another important part is that you have a **Promise** variable also declared inside your original function and available in your annotation's
implementation.

**The original function will change it's return type to a promise** see the [Usage Example](#using-the-annotated-module) section for more info

```
    function implementation(x, y) {
        var Promise = require('promised-io/promise');
        var self = this;
        return Promise.seq([
            function() {
                console.log("doing something before");
            },
            fn.bind(self, x, y),
            function(result) {
                console.log("doing something after");
                return result;
            }
        ]);
    }
    
    
    module.exports = {
        isDecorator: true,
        implementation: implementation
    }
```

## Using the annotations

### Naming

After you have written your possible annotations you must give the js files containing the implementation a suitable name for that the name of the file will be the
annotation's name. Avoid naming annotations the same for that the last implementation will be the correct one.

Example: `/x/y/myAnnotations/My.js` will be used inside modules like `@My()`

### Registering

To register an annotation before you use the module you must run the following code:

```
    var annoteModule = require('annoteJS');
    annoteModule.registerAnnotations('/x/y/z/myAnnotations');
```

The registerAnnotations method receives **absolute path of the folder location where you have your annotations declared**.


### Writing an annotated module

An annotated module module is a standard module that contains annotations and has 2 restrictions:

1. module.exports must have the **key name** the **same with** the **annotated function's name** (in case of functions) or must have the **key name** 
the **same with** the **class name**
2. You can have either a module with multiple functions or a module with just one class (for the moment this can't be combined)

#### Writing an annotated class module

```
    function AnnotatedClass() {}
    
    @My()
    AnnotatedClass.prototype.doSomething = function() {...}
    
    module.exports = {
        AnnotatedClass: AnnotatedClass
    }
```

#### Writing an annotated module with multiple functions but !!NO CLASS!!.

```
    @My()
    function annotatedF1() {}
    
    @My()
    function annotatedF2() {}
    
    module.exports = {
        annotatedF1: annotatedF1,
        annotatedF2: annotatedF2
    }
```


### Using the annotated module

In order for the module to work you must require the annotatedModule as described in the bellow code.

**Annotation - My** - path /x/y/annotations
```
    function My(x, y) {
        return Promise.seq([
            fn.bind(this, x, y),
            function(result) {
                console.log("the result is ", result);
                return result;
            }
        ]);
    }
    
    module.exports = {
        isDecorator: true,
        implementation: My
    }
```


**Annotated Module - Calculator**
```
    @My()
    function calculate(x, y) {
        return x + y;
    }
    
    module.exports = {
        calculate: calculate
    }
```

**Usage of the annotated Module**
```
    var annoteModule = require('annoteJS');
    annoteModule.registerAnnotations('/x/y/z/myAnnotations');
    
    var annoteJS = annoteModule.get(),
        annotatedCalculator = annoteJS.requireWithAnnotations('./path/to/my/Calculator.js');
    
    annotatedCalculator.calculate(2,3).then(function(result) {
        console.log("the official result of all in all module is ", result);
    }, function(err) {
        //something bad happened
    });
```


### Annotation variables

You are also permitted to pass some variables to your annotations for example:
 
```
    function My() {
        console.log(My.path);
        console.log(My.stuff);
        console.log(My.defaultArgument);
    }
```


```
    @My(path=left,stuff=1)
    function annotatedFunction(){...}
    
    @My(critter)
    function defaultArgumentAnnotatedFunction() {...}
    
    module.exports = {
        annotatedFunction: annotatedFunction,
        defaultArgumentAnnotatedFunction: defaultArgumentAnnotatedFunction
    }
```

When no name for variable is passed the value inside the brackets is found on the defaultArgument field of the annotation's implementation.
