let table = null;
let currentTableData = null;

function isMobileViewport() {
    return window.matchMedia("(max-width: 767px)").matches;
}

function formatCellValue(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}

function renderMobileTable(data) {
    const rows = Array.isArray(data) ? data : [data];
    const $container = $("#resultTable").empty();

    if (!rows.length) {
        $container.html("<div class='mobile-empty-state'>No data available.</div>");
        return;
    }

    const rowData = rows[0] || {};
    const visibleFields = Object.keys(FIELD_CONFIG)
        .map(key => FIELD_CONFIG[key])
        .filter(cfg => cfg && cfg.visible !== false)
        .sort((a, b) => a.order - b.order);

    const $wrapper = $("<div>", { class: "mobile-result-scroll" });
    const $table = $("<table>", { class: "mobile-transposed-table" });
    const $thead = $("<thead>").append(
        $("<tr>").append(
            $("<th>", { scope: "col" }).text("Field"),
            $("<th>", { scope: "col" }).text("Value")
        )
    );
    const $tbody = $("<tbody>");

    visibleFields.forEach(cfg => {
        const $row = $("<tr>");
        $("<th>", { scope: "row" }).text(cfg.title).appendTo($row);
        $("<td>").text(formatCellValue(rowData[cfg.apiField])).appendTo($row);
        $tbody.append($row);
    });

    $table.append($thead, $tbody);
    $wrapper.append($table);
    $container.append($wrapper);
}

function setColumnVisibility(field, visible) {
    if (!FIELD_CONFIG[field]) return;

    FIELD_CONFIG[field].visible = visible;

    $(`.colCheck[data-field="${field}"]`).prop("checked", visible);

    if (isMobileViewport()) {
        renderTable(currentTableData);
        return;
    }

    if (table) {
        const col = table.getColumn(field);
        if (col) {
            visible ? col.show() : col.hide();
        }
    }
}

function setGroupVisibility(group, visible) {
    Object.keys(FIELD_CONFIG).forEach(key => {
        const cfg = FIELD_CONFIG[key];
        if (cfg.group === group) {
            setColumnVisibility(cfg.apiField, visible);
        }
    });
}

function renderTable(data) {

    if (!data) return;

    currentTableData = Array.isArray(data) ? data : [data];
    updateSingleBaleExportState(currentTableData);

    const columns = Object.keys(FIELD_CONFIG).map(key => {

        const cfg = FIELD_CONFIG[key];

        return {
            title: cfg.title,
            field: cfg.apiField,
            visible: cfg.visible,
            frozen: cfg.frozen || false,
            headerSort: false,
            headerFilter: false
        };
    }).sort((a, b) => {
        return FIELD_CONFIG[a.field].order - FIELD_CONFIG[b.field].order;
    });

    if (table) {
        table.destroy();
        table = null;
    }

    if (isMobileViewport()) {
        renderMobileTable(currentTableData);
        return;
    }

    table = new Tabulator("#resultTable", {
        data: currentTableData,
        columns: columns,
        layout: "fitDataStretch",
        height: "650px"
    });

    syncColumnManager();
}