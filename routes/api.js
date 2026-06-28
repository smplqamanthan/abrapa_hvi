const router = require("express").Router();
const { translateKeys } = require("../services/translator");
const { getBaleDetails } = require("../services/abrapaService");

router.get("/bale/:baleNo", async (req, res) => {

  try {

    const apiResult = await getBaleDetails(req.params.baleNo);

    if (!apiResult.success) {
      return res.json(apiResult);
    }

    const translated = translateKeys(apiResult.data);

    return res.json({
      success: true,
      data: translated,
      source: apiResult.source
    });

  } catch (err) {

    console.error("API ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }

});

module.exports = router;