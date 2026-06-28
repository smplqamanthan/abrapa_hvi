const fieldConfig = require("../config/fieldConfig");

function translateKeys(data) {

    const translated = {};

    Object.keys(data).forEach(key => {

        const config = fieldConfig[key];

        if (!config) return;

        translated[config.apiField] = data[key];

    });

    return translated;

}

module.exports = {
    translateKeys
};