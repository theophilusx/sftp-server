const { timingSafeEqual } = require("crypto");
const log = require("./logger");

function checkValue(input, allowed) {
  const autoReject = input.length !== allowed.length;
  if (autoReject) {
    // Prevent leaking length information by always making a comparison with the
    // same input when lengths don't match what we expect ...
    log.debug("checkValue", "Autoreject - values don't have same length");
    allowed = input;
  }
  const isMatch = timingSafeEqual(input, allowed);
  autoReject || !isMatch
    ? log.debug("checkValue", "Values not equal")
    : log.debug("checkValue", "Values are equal");
  return !autoReject && isMatch;
}

module.exports = {
  checkValue,
};
