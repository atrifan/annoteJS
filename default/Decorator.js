function Decorator(x, y) {
    console.log(arguments);
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
    implementation: Decorator
}