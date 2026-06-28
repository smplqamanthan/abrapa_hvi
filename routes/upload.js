const router = require("express").Router();
const crypto = require("crypto");
const multer = require("multer");
const { getBaleDetails } = require("../services/abrapaService");
const { parseTemplateFile, createResultsWorkbook } = require("../services/excelService");
const { saveFile, getFile } = require("../services/tempStore");
const fieldConfig = require("../config/fieldConfig");

const upload = multer({ storage: multer.memoryStorage() });

// In-memory progress tracking (use database in production)
const progressTracker = {};
const processingTasks = {}; // Track ongoing processing tasks

const CHUNK_SIZE = 500;

function trackProgress(sessionId, processed, total) {
    progressTracker[sessionId] = {
        processed,
        total,
        percentage: Math.round((processed / total) * 100),
        timestamp: Date.now()
    };
}

function getProgress(sessionId) {
    return progressTracker[sessionId] || null;
}

function cleanupProgress(sessionId) {
    delete progressTracker[sessionId];
    delete processingTasks[sessionId];
}

async function processChunk(sessionId, baleNumbers, chunkIndex, startingBaleIndex, totalBales) {
    const results = [];
    const progressInterval = Math.max(1, Math.floor(totalBales / 10)); // Update every 10% of total

    for (let i = 0; i < baleNumbers.length; i++) {
        const baleNo = baleNumbers[i];
        try {
            const apiResult = await getBaleDetails(baleNo);

            if (!apiResult.success) {
                results.push({ baleNumber: baleNo, error: apiResult.message });
            } else {
                results.push({ baleNumber: baleNo, ...apiResult.data });
            }
        } catch (err) {
            console.error(`Error processing bale ${baleNo}:`, err.message);
            results.push({ baleNumber: baleNo, error: err.message });
        }

        // Track progress every 10% of total bales
        const processedSoFar = startingBaleIndex + i + 1;
        if (processedSoFar % progressInterval === 0 || processedSoFar === totalBales) {
            trackProgress(sessionId, processedSoFar, totalBales);
        }
    }

    return results;
}

// Background processing function
async function processAllChunks(sessionId, chunks, totalBales) {
    try {
        const tokens = [];

        // Track initial progress
        trackProgress(sessionId, 0, totalBales);

        // Process chunks sequentially and track progress
        for (let i = 0; i < chunks.length; i++) {
            console.log(`[UPLOAD] ${sessionId} - Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} bales)...`);
            const chunk = chunks[i];
            const startingBaleIndex = i * CHUNK_SIZE;
            const results = await processChunk(sessionId, chunk, i, startingBaleIndex, totalBales);

            try {
                // Create workbook for this chunk
                const buffer = await createResultsWorkbook(results, fieldConfig);
                const token = crypto.randomUUID();

                saveFile(token, {
                    buffer,
                    filename: `abrapa-results-chunk-${i + 1}.xlsx`
                });

                tokens.push({
                    token,
                    chunkIndex: i + 1,
                    startRow: i * CHUNK_SIZE + 1,
                    endRow: Math.min((i + 1) * CHUNK_SIZE, totalBales),
                    count: results.length
                });
            } catch (err) {
                console.error(`[UPLOAD] ${sessionId} - Error creating workbook for chunk ${i + 1}:`, err.message);
            }

            console.log(`[UPLOAD] ${sessionId} - Chunk ${i + 1} done. Progress: ${Math.min((i + 1) * CHUNK_SIZE, totalBales)}/${totalBales}`);
        }

        // Store the tokens for retrieval
        processingTasks[sessionId] = {
            complete: true,
            tokens,
            totalChunks: chunks.length,
            totalBales
        };

        console.log(`[UPLOAD] ${sessionId} - All chunks processed successfully.`);
    } catch (err) {
        console.error(`[UPLOAD] ${sessionId} - Background processing error:`, err);
        processingTasks[sessionId] = {
            complete: true,
            error: err.message
        };
    }
}

router.post("/template", upload.single("template"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Template file is required." });
    }

    try {
        const sessionId = crypto.randomUUID();
        console.log(`[UPLOAD] Starting upload with session ID: ${sessionId}`);
        
        const baleNumbers = await parseTemplateFile(req.file.buffer, req.file.originalname);
        console.log(`[UPLOAD] ${sessionId} - Parsed ${baleNumbers.length} bale numbers`);

        if (!baleNumbers.length) {
            return res.status(400).json({ success: false, message: "No bale numbers found in template." });
        }

        const totalBales = baleNumbers.length;
        const chunks = [];

        // Split into chunks of 500
        for (let i = 0; i < baleNumbers.length; i += CHUNK_SIZE) {
            chunks.push(baleNumbers.slice(i, i + CHUNK_SIZE));
        }

        console.log(`[UPLOAD] ${sessionId} - Split into ${chunks.length} chunks`);

        // Initialize progress
        trackProgress(sessionId, 0, totalBales);

        // START BACKGROUND PROCESSING (don't wait for it)
        processAllChunks(sessionId, chunks, totalBales).catch(err => {
            console.error(`[UPLOAD] ${sessionId} - Uncaught error in background processing:`, err);
        });

        // Return immediately with sessionId so polling can start
        return res.json({
            success: true,
            sessionId,
            totalChunks: chunks.length,
            totalBales,
            message: "Processing started. Use polling to track progress."
        });

        // Clean up old progress data after 10 minutes
        // (can be moved to a background job)
    } catch (err) {
        console.error("UPLOAD TEMPLATE ERROR:", err);
        return res.status(500).json({ success: false, message: "Failed to process template file: " + err.message });
    }
});

router.get("/progress/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const progress = getProgress(sessionId);
    const task = processingTasks[sessionId];

    if (!progress) {
        return res.status(404).json({ success: false, message: "Session not found or expired." });
    }

    // If task is complete, include the tokens in the response
    if (task && task.complete) {
        return res.json({
            success: true,
            ...progress,
            tokens: task.tokens,
            totalChunks: task.totalChunks,
            isComplete: true,
            error: task.error || null
        });
    }

    return res.json({
        success: true,
        ...progress,
        isComplete: false
    });
});

module.exports = router;
