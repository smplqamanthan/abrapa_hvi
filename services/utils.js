function flattenObject(obj, output = {}) {
    for (const key in obj) {
        const value = obj[key];

        if (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            flattenObject(value, output);
        } else {
            output[key] = value;
        }
    }

    return output;
}

module.exports = {
    flattenObject
};