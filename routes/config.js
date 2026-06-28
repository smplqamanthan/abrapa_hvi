const express = require("express");
const router = express.Router();

const fieldConfig = require("../config/fieldConfig");

router.get("/fields", (req, res) => {

    const fields = Object.entries(fieldConfig).map(([apiField, config]) => ({
        apiField,
        ...config
    }));

    res.json(fields);

});

module.exports = router;