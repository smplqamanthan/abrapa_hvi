const ExcelJS = require("exceljs");
const csv = require("csv-parser");
const stream = require("stream");

function normalizeBaleValue(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    return str === "" ? null : str;
}

async function parseCsvTemplate(buffer) {
    const results = [];
    const readStream = new stream.PassThrough();
    readStream.end(buffer);

    return new Promise((resolve, reject) => {
        readStream
            .pipe(csv())
            .on("data", row => {
                const keys = Object.keys(row);
                if (!keys.length) return;
                const firstColumnValue = normalizeBaleValue(row[keys[0]]);
                if (firstColumnValue) {
                    results.push(firstColumnValue);
                }
            })
            .on("end", () => resolve(results))
            .on("error", reject);
    });
}

async function parseExcelTemplate(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const values = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const raw = row.getCell(1).value;
        const bale = normalizeBaleValue(raw);
        if (bale) values.push(bale);
    });

    return values;
}

async function parseTemplateFile(fileBuffer, originalname) {
    const name = originalname.toLowerCase();

    if (name.endsWith(".csv")) {
        return await parseCsvTemplate(fileBuffer);
    }

    return await parseExcelTemplate(fileBuffer);
}

async function createTemplateWorkbook() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Template");
    sheet.columns = [
        { header: "Bale Number", key: "baleNumber", width: 30 }
    ];

    sheet.addRow({ baleNumber: "1234567890" });
    sheet.addRow({ baleNumber: "9876543210" });

    return workbook.xlsx.writeBuffer();
}

async function createResultsWorkbook(results, fieldConfig) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Results");

    const fields = Object.keys(fieldConfig)
        .map(key => fieldConfig[key])
        .filter(cfg => cfg && cfg.visible !== false)
        .sort((a, b) => a.order - b.order);

    const headers = [
        { header: "Bale Number", key: "baleNumber", width: 25 },
        ...fields.map(cfg => ({ header: cfg.title, key: cfg.apiField, width: 18 })),
        { header: "Error", key: "error", width: 40 }
    ];

    sheet.columns = headers;

    results.forEach(result => {
        const row = {
            baleNumber: result.baleNumber,
            error: result.error || ""
        };

        fields.forEach(cfg => {
            row[cfg.apiField] = result[cfg.apiField] !== undefined ? result[cfg.apiField] : "";
        });

        sheet.addRow(row);
    });

    return workbook.xlsx.writeBuffer();
}

module.exports = {
    parseTemplateFile,
    createTemplateWorkbook,
    createResultsWorkbook
};
