const router = require("express").Router();
const crypto = require("crypto");
const multer = require("multer");
const { getBaleDetails } = require("../services/abrapaService");
const { parseTemplateFile, createResultsWorkbook } = require("../services/excelService");
const { saveFile } = require("../services/tempStore");
const fieldConfig = require("../config/fieldConfig");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/template", upload.single("template"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Template file is required." });
    }

    try {
        const baleNumbers = await parseTemplateFile(req.file.buffer, req.file.originalname);

        if (!baleNumbers.length) {
            return res.status(400).json({ success: false, message: "No bale numbers found in template." });
        }

        const results = [];

        for (const baleNo of baleNumbers) {
            const apiResult = await getBaleDetails(baleNo);

            if (!apiResult.success) {
                results.push({ baleNumber: baleNo, error: apiResult.message });
                continue;
            }

            results.push({ baleNumber: baleNo, ...apiResult.data });
        }

        const buffer = await createResultsWorkbook(results, fieldConfig);
        const token = crypto.randomUUID();

        saveFile(token, {
            buffer,
            filename: `abrapa-results-${Date.now()}.xlsx`
        });

        return res.json({ success: true, token, count: results.length });
    } catch (err) {
        console.error("UPLOAD TEMPLATE ERROR:", err);
        return res.status(500).json({ success: false, message: "Failed to process template file." });
    }
});

module.exports = router;
