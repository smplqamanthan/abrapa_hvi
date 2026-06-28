const files = new Map();
const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

function saveFile(token, payload) {
    const expiresAt = Date.now() + EXPIRY_MS;
    files.set(token, { payload, expiresAt });
}

function getFile(token) {
    const entry = files.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        files.delete(token);
        return null;
    }
    return entry.payload;
}

function deleteFile(token) {
    files.delete(token);
}

module.exports = {
    saveFile,
    getFile,
    deleteFile,
};
