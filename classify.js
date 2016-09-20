function ClassBannana() {}

@Standalone()
ClassBannana.prototype.entryMethod = function() {
    console.log("here it is");
}

@Decorator()
ClassBannana.prototype.decoratedMethod = function(x, y) {
    return x + y;
}

module.exports = {
    ClassBannana: ClassBannana
}