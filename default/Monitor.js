function Monitor() {
    console.log("gimson");
    fn.call(this, request, response)
}

module.exports = {
    implementation: Monitor,
    isDecorator: true
}