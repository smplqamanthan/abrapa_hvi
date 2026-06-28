const NodeCache = require("node-cache");

// cache TTL: 30 minutes
const cache = new NodeCache({ stdTTL: 1800 });

function get(key) {
  return cache.get(key);
}

function set(key, value) {
  cache.set(key, value);
}

module.exports = {
  get,
  set
};