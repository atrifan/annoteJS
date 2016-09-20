@Decorator()
function decoratedBanana(x, y) {
    return x + y;
}

@Standalone()
function standardBanana(x, y) {
    console.log("almete");
}

module.exports = {
    decoratedBanana: decoratedBanana,
    standardBanana: standardBanana
};