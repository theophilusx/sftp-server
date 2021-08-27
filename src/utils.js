const { timingSafeEqual } = require("crypto");
const { debugHigh } = require("./logger");

function checkValue(input, allowed) {
  const autoReject = input.length !== allowed.length;
  if (autoReject) {
    // Prevent leaking length information by always making a comparison with the
    // same input when lengths don't match what we expect ...
    debugHigh("checkValue", "Autoreject - values don't have same length");
    allowed = input;
  }
  const isMatch = timingSafeEqual(input, allowed);
  autoReject || !isMatch
    ? debugHigh("checkValue", "Values not equal")
    : debugHigh("checkValue", "Values are equal");
  return !autoReject && isMatch;
}

module.exports = {
  checkValue,
};
