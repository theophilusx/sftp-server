const dotenv = require("dotenv");
const { join } = require("path");

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
  logFile: process.env.SFTP_LOG_FILE || "./sftp-server.log",
};

module.exports = config;
