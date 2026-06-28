let FIELD_CONFIG = {};
let currentUploadToken = null;
let currentSessionId = null;
let currentTokens = null;

function renderColumnManager() {
    const groups = {};

    Object.values(FIELD_CONFIG).sort((a, b) => a.order - b.order).forEach(cfg => {
        groups[cfg.group] = groups[cfg.group] || [];
        groups[cfg.group].push(cfg);
    });

    const $container = $("#columnManager").empty();

    Object.entries(groups).forEach(([group, configs]) => {
        const $groupBox = $(
            `<details class="group-box">
                <summary class="group-title">
                    <label class="mb-0">
                        <input type="checkbox" class="groupCheck me-2" value="${group}" checked>
                        ${group}
                    </label>
                </summary>
                <div class="group-items"></div>
            </details>`
        );

        const $items = $groupBox.find(".group-items");

        configs.forEach(cfg => {
            $items.append(
                `<label class="col-item">
                    <input type="checkbox" class="colCheck me-2" data-field="${cfg.apiField}" ${cfg.visible ? "checked" : ""}>
                    ${cfg.title}
                </label>`
            );
        });

        $container.append($groupBox);
    });

    syncColumnManager();

    $(".colCheck").off("change").on("change", function () {
        const field = $(this).data("field");
        const checked = $(this).is(":checked");
        setColumnVisibility(field, checked);
    });
}

function resetUploadState() {
    currentUploadToken = null;
    currentSessionId = null;
    currentTokens = null;
    $("#progressContainer").hide();
    $("#downloadsSection").hide();
    $("#progressBar").css("width", "0%").attr("aria-valuenow", "0");
    $("#progressPercentage").text("0%");
    $("#progressCount").text("0");
    $("#progressTotal").text("0");
    $("#uploadStatus").text("");
    $("#downloadList").empty();
}

function isMobileDownloadContext() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.matchMedia("(max-width: 767px)").matches;
}

function updateSingleBaleExportState(data) {
    const hasData = Array.isArray(data) ? data.length > 0 : Boolean(data);
    $("#singleBaleExportBtn").prop("disabled", !hasData);
}

async function downloadBlobResponse(response, filename) {
    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || "Download failed.");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    if (isMobileDownloadContext()) {
        const newWindow = window.open(objectUrl, "_blank", "noopener,noreferrer");
        if (!newWindow) {
            window.location.href = objectUrl;
        }
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        return;
    }

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
}

async function downloadFile(url, filename) {
    const response = await fetch(url);
    return downloadBlobResponse(response, filename);
}

async function downloadJsonFile(url, payload, filename) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    return downloadBlobResponse(response, filename);
}

// Poll progress
async function pollProgress(sessionId, onComplete) {
    let pollInterval;
    let tokensRetrieved = false;
    const startTime = Date.now();
    
    return new Promise((resolve) => {
        pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/upload/progress/${sessionId}`);
                const result = await response.json();

                if (result.success) {
                    const { processed, total, percentage, isComplete, tokens, totalChunks } = result;
                    $("#progressBar").css("width", percentage + "%").attr("aria-valuenow", percentage);
                    $("#progressPercentage").text(percentage + "%");
                    $("#progressCount").text(processed);
                    $("#progressTotal").text(total);
                    
                    // Update elapsed time and estimate remaining time
                    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
                    let statusMsg = `Fetching HVI data for bales...`;
                    if (percentage > 0) {
                        const estimatedRemaining = Math.round((elapsedSeconds / percentage) * (100 - percentage));
                        statusMsg = `Processing: ${processed}/${total} bales (${estimatedRemaining}s remaining)`;
                    }
                    $("#uploadStatus").text(statusMsg);

                    // When processing is complete and we have tokens
                    if (isComplete && tokens && !tokensRetrieved) {
                        tokensRetrieved = true;
                        currentTokens = tokens;
                        clearInterval(pollInterval);
                        if (onComplete) onComplete(tokens, total, totalChunks);
                        resolve();
                    }
                }
            } catch (err) {
                console.error("Progress polling error:", err);
            }
        }, 200);

        // Timeout after 10 minutes
        setTimeout(() => {
            clearInterval(pollInterval);
            resolve();
        }, 10 * 60 * 1000);
    });
}

function displayDownloadLinks(tokens, totalBales) {
    const $list = $("#downloadList").empty();

    tokens.forEach((token, index) => {
        const $item = $(`
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>Part ${token.chunkIndex}</strong>
                    <span class="badge bg-info ms-2">${token.count} rows</span>
                    <small class="text-muted d-block">Rows ${token.startRow} - ${token.endRow}</small>
                </div>
                <button class="btn btn-sm btn-success part-download-btn" data-token="${token.token}" data-index="${token.chunkIndex}">
                    <i class="bi bi-download"></i> Download
                </button>
            </div>
        `);

        $item.find(".part-download-btn").click(function () {
            const btnToken = $(this).data("token");
            const chunkIndex = $(this).data("index");
            downloadFile(`/download/results/${btnToken}`, `abrapa-results-part-${chunkIndex}.xlsx`).catch(err => {
                console.error(err);
                alert(err.message);
            });
        });

        $list.append($item);
    });

    $("#downloadsSection").show();
}

$(document).ready(async function () {

    // 1. Load config FIRST
    const configRes = await fetch("/api/config/fields");

    const configArray = await configRes.json();

    // convert array → object (safe format)
    FIELD_CONFIG = {};
    configArray.forEach(f => {
        FIELD_CONFIG[f.apiField] = f;
    });

    console.log("FIELD CONFIG LOADED", FIELD_CONFIG);

    renderColumnManager();
    resetUploadState();

    $("#toggleColumnManagerBtn").click(function () {
        const $panel = $("#columnManager");
        const isHidden = $panel.hasClass("d-none");
        $panel.toggleClass("d-none");
        $(this).attr("aria-expanded", isHidden ? "true" : "false");
        $(this).attr("title", isHidden ? "Hide filters" : "Show filters");
    });

    // 2. Search button
    const searchButtonContent = '<i class="bi bi-search"></i>';

    $("#searchBtn").click(async function () {

        const baleNo = $("#baleNumber").val().trim();

        if (!baleNo) {
            alert("Please enter Bale Number.");
            return;
        }

        const btn = $(this);
        btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');

        try {
            const response = await fetch(`/api/bale/${encodeURIComponent(baleNo)}`);
            const result = await response.json();

            if (!result.success) {
                alert(result.message || "Unable to fetch data.");
                return;
            }

            renderTable(result.data);
            updateSingleBaleExportState(result.data);

        } catch (err) {
            console.error(err);
            alert("Server Error.");
        } finally {
            btn.prop("disabled", false).html(searchButtonContent);
        }
    });

    $("#baleNumber").keydown(function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            $("#searchBtn").click();
        }
    });

    $("#downloadTemplateBtn").click(function () {
        downloadFile("/download/template", "abrapa-template.xlsx").catch(err => {
            console.error(err);
            alert(err.message);
        });
    });

    $("#singleBaleExportBtn").click(async function () {
        const data = Array.isArray(currentTableData) && currentTableData.length
            ? currentTableData
            : currentTableData
                ? [currentTableData]
                : null;
        const baleNumber = $("#baleNumber").val().trim();

        if (!data) {
            $("#uploadStatus").text("No bale results available to export.");
            return;
        }

        const btn = $(this);
        btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');

        try {
            await downloadJsonFile(
                "/download/single",
                {
                    baleNumber: baleNumber || data[0]?.baleNumber || "",
                    data,
                    fieldConfig: FIELD_CONFIG
                },
                `abrapa-single-${baleNumber || data[0]?.baleNumber || "result"}.xlsx`
            );
        } catch (err) {
            console.error(err);
            $("#uploadStatus").text(err.message);
        } finally {
            btn.prop("disabled", false).html('<i class="bi bi-download"></i>');
            updateSingleBaleExportState(data);
        }
    });

    $("#uploadTemplateInput").on("change", function () {
        const hasFile = this.files && this.files.length > 0;
        $("#uploadTemplateBtn").prop("disabled", !hasFile);
        if (!hasFile) {
            resetUploadState();
        }
    });

    $("#uploadTemplateBtn").click(async function () {
        const input = document.getElementById("uploadTemplateInput");
        if (!input.files || !input.files.length) {
            alert("Please select a template file to upload.");
            return;
        }

        const file = input.files[0];
        const formData = new FormData();
        formData.append("template", file);

        const btn = $(this);
        btn.prop("disabled", true).html("Uploading...");
        resetUploadState();
        $("#progressContainer").show();
        $("#uploadStatus").text("Submitting file for processing...");

        try {
            const response = await fetch("/upload/template", {
                method: "POST",
                body: formData
            });

            const result = await response.json();
            if (!result.success) {
                $("#uploadStatus").html(`<div class="alert alert-danger mb-0"><i class="bi bi-exclamation-triangle"></i> ${result.message || "Upload failed."}</div>`);
                $("#progressContainer").hide();
                return;
            }

            currentSessionId = result.sessionId;
            const totalBales = result.totalBales;
            const totalChunks = result.totalChunks;

            // Initialize progress display
            $("#progressBar").css("width", "0%").attr("aria-valuenow", "0");
            $("#progressPercentage").text("0%");
            $("#progressCount").text("0");
            $("#progressTotal").text(totalBales);
            $("#uploadStatus").text("Processing started. Please wait...");

            // Start polling progress and wait for completion
            await pollProgress(currentSessionId, (tokens, total, chunks) => {
                displayDownloadLinks(tokens, total);
                $("#uploadStatus").html(`<div class="alert alert-success mb-0"><i class="bi bi-check-circle"></i> Successfully processed ${total} bale(s) in ${chunks} part(s). Download individual parts below or use "Download All Parts".</div>`);
                $("#progressContainer").hide();
            });
        } catch (err) {
            console.error(err);
            $("#uploadStatus").html(`<div class="alert alert-danger mb-0"><i class="bi bi-exclamation-triangle"></i> Upload failed: ${err.message}</div>`);
            $("#progressContainer").hide();
        } finally {
            btn.prop("disabled", false).html("Upload Template");
        }
    });

    $("#downloadAllBtn").click(async function () {
        if (!currentTokens || currentTokens.length === 0) {
            alert("No parts available for download.");
            return;
        }

        const btn = $(this);
        btn.prop("disabled", true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Downloading...');

        try {
            for (const token of currentTokens) {
                await downloadFile(`/download/results/${token.token}`, `abrapa-results-part-${token.chunkIndex}.xlsx`);
                // Add a small delay between downloads to prevent overwhelming the browser
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            $("#uploadStatus").html(`<div class="alert alert-success mb-0">✓ Downloaded all ${currentTokens.length} part(s).</div>`);
        } catch (err) {
            console.error(err);
            $("#uploadStatus").text("Error downloading files: " + err.message);
        } finally {
            btn.prop("disabled", false).html("Download All Parts");
        }
    });
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');

            if (registration.waiting) {
                registration.waiting.postMessage({ action: 'skipWaiting' });
            }

            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                if (!worker) return;

                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        worker.postMessage({ action: 'skipWaiting' });
                    }
                });
            });
        } catch (err) {
            console.warn('Service Worker registration failed:', err);
        }
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}
