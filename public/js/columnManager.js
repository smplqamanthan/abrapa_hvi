function syncColumnManager() {

    $(".groupCheck").off("change").on("change", function () {

        const group = $(this).val();
        const checked = $(this).is(":checked");
        setGroupVisibility(group, checked);
    });
}