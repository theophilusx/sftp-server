const { timingSafeEqual } = require("crypto");
const { join } = require("path");
const dotenv = require("dotenv");
const { DEBUG_LEVEL } = require("./constants");

const dotenvPath = join(__dirname, "..", ".env");
let envResult = dotenv.config({ path: dotenvPath });

if (envResult.error) {
  throw new Error(`Failed to prepare environment ${envResult.error.message}`);
}

const config = {
  keyFile: process.env.SFTP_KEY_FILE,
  root: process.env.SFTP_DATA_ROOT || "/tmp",
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
  bindAddress: process.env.SFTP_BIND_ADDRESS || "127.0.0.1",
  port: Number.parseInt(process.env.SFTP_PORT || "2222"),
  debug: Number.parseInt(process.env.SFTP_DEBUG || "0"),
};

debugMsg(DEBUG_LEVEL.LOW, "utils", `Config: ${JSON.stringify(config, null, " ")}`);

function checkValue(input, allowed) {
  const autoReject = input.length !== allowed.length;
  if (autoReject) {
    // Prevent leaking length information by always making a comparison with the
    // same input when lengths don't match what we expect ...
    allowed = input;
  }
  const isMatch = timingSafeEqual(input, allowed);
  return !autoReject && isMatch;
}

function debugMsg(level, name, msgs) {
  if (level <= config.debug) {
    let m = Array.isArray(msgs) ? msgs.join("\n  ") : msgs;
    console.log(`${name}: ${m}`);
  }
}

module.exports = {
  config,
  checkValue,
  debugMsg,
};
