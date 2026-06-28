const axios = require("axios");
const cache = require("./cache");

const BASE_URL =
  "https://api-rastreabilidade.abrapa.com.br/api/v1/integration/portal/Portal";

// ------------------------------------
// Retry helper
// ------------------------------------
async function fetchWithRetry(config, retries = 3) {

  for (let i = 0; i < retries; i++) {
    try {
      return await axios(config);
    } catch (err) {

      const isLast = i === retries - 1;

      console.log(`Attempt ${i + 1} failed`);

      if (isLast) throw err;
    }
  }
}

// ------------------------------------
// Main service
// ------------------------------------
async function getBaleDetails(baleNo) {

  const cacheKey = `bale_${baleNo}`;

  // 1. CHECK CACHE FIRST
  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      success: true,
      data: cached,
      source: "cache"
    };
  }

  try {

    const response = await fetchWithRetry({
      method: "GET",
      url: BASE_URL,
      params: {
        action: "obter_fardo",
        codigo_barra: baleNo,
      },
      timeout: 60000
    });

    const result = response.data;

    if (!result?.success) {
      return {
        success: false,
        message: "No data found from ABRAPA"
      };
    }

    const data = result.data?.resultados || result.data;

    // 2. SAVE TO CACHE
    cache.set(cacheKey, data);

    return {
      success: true,
      data,
      source: "api"
    };

  } catch (err) {

    console.error("ABRAPA ERROR:", err.message);

    if (err.code === "ECONNABORTED") {
      return {
        success: false,
        message: "ABRAPA timeout. Please retry."
      };
    }

    return {
      success: false,
      message: "Failed to fetch ABRAPA data"
    };
  }
}

module.exports = {
  getBaleDetails
};