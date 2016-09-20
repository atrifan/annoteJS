@Path("/test_me")
function Class(x, y) {
    console.log(x,y);
    this._gica = 'new';
}

@GET
Class.prototype.doIt = function() {

}

@Path("/ready")
@GET
Class.prototype.doNew = function() {
    console.log("shit");
}

module.exports = Class;