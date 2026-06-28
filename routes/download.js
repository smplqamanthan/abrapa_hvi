const router = require("express").Router();
const { createTemplateWorkbook, createResultsWorkbook } = require("../services/excelService");
const { getFile, deleteFile } = require("../services/tempStore");

router.get("/template", async (req, res) => {
    try {
        const buffer = await createTemplateWorkbook();

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=abrapa-template.xlsx");
        return res.send(buffer);
    } catch (err) {
        console.error("DOWNLOAD TEMPLATE ERROR:", err);
        return res.status(500).json({ success: false, message: "Failed to generate template." });
    }
});

router.post("/single", async (req, res) => {
    try {
        const { baleNumber, data, fieldConfig } = req.body || {};
        const results = Array.isArray(data) ? data : data ? [data] : [];

        if (!results.length) {
            return res.status(400).json({ success: false, message: "No bale data to export." });
        }

        const normalizedResults = results.map(item => ({
            ...item,
            baleNumber: item?.baleNumber || baleNumber || ""
        }));

        const buffer = await createResultsWorkbook(normalizedResults, fieldConfig || {});

        const filename = `abrapa-single-${baleNumber || normalizedResults[0]?.baleNumber || "result"}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(buffer);
    } catch (err) {
        console.error("DOWNLOAD SINGLE BALE ERROR:", err);
        return res.status(500).json({ success: false, message: "Failed to generate Excel export." });
    }
});

router.get("/results/:token", async (req, res) => {
    const file = getFile(req.params.token);

    if (!file) {
        return res.status(404).json({ success: false, message: "Result file not found or expired." });
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
    deleteFile(req.params.token);
});

module.exports = router;
