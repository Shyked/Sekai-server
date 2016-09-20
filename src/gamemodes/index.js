// From Ogar

module.exports = {
    Default: require('./Default'),
    Nova: require('./Nova'),
    Soda: require('./Soda')
};

var get = function(modeId, world) {
    var mode;
    modeId = String(modeId).toLowerCase();
    switch (modeId) {
        case "nova": // Nova
            mode = new module.exports.Nova(world);
            break;
        case "soda": // Soda
            mode = new module.exports.Soda(world);
            break;
        case "default":
        default: // Default
            mode = new module.exports.Default(world);
            break;
    }
    return mode;
};

module.exports.get = get;

