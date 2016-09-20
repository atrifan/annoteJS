var annoteJs = require('./index').get(),
    example_functions = annoteJs.requireWithAnnotations('./functionify'),
    exampleClass = annoteJs.requireWithAnnotations('./classify').ClassBannana;

example_functions.decoratedBanana(1, 2).then(function(result) {
    console.log("result is ", result);
});

var instanceExampleClass = new exampleClass();
instanceExampleClass.decoratedMethod(3,4).then(function(result) {
    console.log("result from class is ", result);
})