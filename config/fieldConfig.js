module.exports = {

    // =====================================================
    // General
    // =====================================================

    sai: {
        apiField: "sai",
        title: "Bale Number",
        group: "General",
        order: 1,
        visible: true,
        frozen: false
    },

    safra: {
        apiField: "safra",
        title: "Crop Year",
        group: "General",
        order: 2,
        visible: true
    },

    descricaoSafra: {
        apiField: "descricaoSafra",
        title: "Crop Description",
        group: "General",
        order: 3,
        visible: false
    },

    anoVigencia: {
        apiField: "anoVigencia",
        title: "Crop Effective Year",
        group: "General",
        order: 4,
        visible: false
    },

    status_analise: {
        apiField: "status_analise",
        title: "Analysis Status",
        group: "General",
        order: 5,
        visible: false
    },

    // =====================================================
    // HVI Results
    // =====================================================

    mic: {
        apiField: "mic",
        title: "Mic",
        group: "HVI",
        order: 10,
        visible: true
    },

    len: {
        apiField: "len",
        title: "UHML",
        group: "HVI",
        order: 11,
        visible: true
    },

    unf: {
        apiField: "unf",
        title: "UI",
        group: "HVI",
        order: 12,
        visible: true
    },

    str: {
        apiField: "str",
        title: "STR",
        group: "HVI",
        order: 13,
        visible: true
    },

    elg: {
        apiField: "elg",
        title: "ELONG",
        group: "HVI",
        order: 14,
        visible: true
    },

    rd: {
        apiField: "rd",
        title: "Rd",
        group: "HVI",
        order: 15,
        visible: true
    },

    b: {
        apiField: "b",
        title: "+b",
        group: "HVI",
        order: 16,
        visible: true
    },

    cg: {
        apiField: "cg",
        title: "CG",
        group: "HVI",
        order: 17,
        visible: true
    },

    sci: {
        apiField: "sci",
        title: "SCI",
        group: "HVI",
        order: 18,
        visible: true
    },

    mat: {
        apiField: "mat",
        title: "MR",
        group: "HVI",
        order: 19,
        visible: true
    },

    sfi: {
        apiField: "sfi",
        title: "SFI",
        group: "HVI",
        order: 20,
        visible: true
    },

    // =====================================================
    // Farm
    // =====================================================

    up_nome: {
        apiField: "up_nome",
        title: "Farm Name",
        group: "Farm",
        order: 30,
        visible: true
    },

    up_produtor: {
        apiField: "up_produtor",
        title: "Producer Name",
        group: "Farm",
        order: 31,
        visible: true
    },

    up_cidade: {
        apiField: "up_cidade",
        title: "Farm City",
        group: "Farm",
        order: 32,
        visible: false
    },

    up_estado: {
        apiField: "up_estado",
        title: "Farm State",
        group: "Farm",
        order: 33,
        visible: false
    },

    up_descricao_safra: {
        apiField: "up_descricao_safra",
        title: "Farm Crop Year",
        group: "Farm",
        order: 34,
        visible: false
    },

    // =====================================================
    // Gin
    // =====================================================

    uba_id: {
        apiField: "uba_id",
        title: "Gin ID",
        group: "Gin",
        order: 40,
        visible: true
    },

    uba_nome_fantasia: {
        apiField: "uba_nome_fantasia",
        title: "Gin Name",
        group: "Gin",
        order: 41,
        visible: true
    },

    uba_razao_social: {
        apiField: "uba_razao_social",
        title: "Gin Company",
        group: "Gin",
        order: 42,
        visible: false
    },

    uba_bairro: {
        apiField: "uba_bairro",
        title: "Gin District",
        group: "Gin",
        order: 43,
        visible: false
    },

    uba_cidade: {
        apiField: "uba_cidade",
        title: "Gin City",
        group: "Gin",
        order: 44,
        visible: false
    },

    uba_cep: {
        apiField: "uba_cep",
        title: "Gin ZIP Code",
        group: "Gin",
        order: 45,
        visible: false
    },

    uba_uf: {
        apiField: "uba_uf",
        title: "Gin State",
        group: "Gin",
        order: 46,
        visible: false
    }
};