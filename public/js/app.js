let FIELD_CONFIG = {};
let currentUploadToken = null;

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
    $("#downloadExcelBtn").hide().removeData("token");
    $("#uploadStatus").text("");
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
        $("#uploadStatus").text("Processing uploaded file...");
        resetUploadState();

        try {
            const response = await fetch("/upload/template", {
                method: "POST",
                body: formData
            });

            const result = await response.json();
            if (!result.success) {
                $("#uploadStatus").text(result.message || "Upload failed.");
                return;
            }

            currentUploadToken = result.token;
            $("#downloadExcelBtn").show().data("token", result.token);
            $("#uploadStatus").text(`${result.count} bale(s) processed. Click Download Excel to download results.`);
        } catch (err) {
            console.error(err);
            $("#uploadStatus").text("Upload failed. Please try again.");
        } finally {
            btn.prop("disabled", false).html("Upload Template");
        }
    });

    $("#downloadExcelBtn").click(async function () {
        const token = $(this).data("token") || currentUploadToken;
        if (!token) {
            $("#uploadStatus").text("No processed data available for download.");
            return;
        }

        try {
            await downloadFile(`/download/results/${token}`, `abrapa-results-${Date.now()}.xlsx`);
            $("#uploadStatus").text("Excel download started.");
        } catch (err) {
            console.error(err);
            $("#uploadStatus").text(err.message);
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
