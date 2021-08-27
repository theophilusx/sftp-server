const { createLogger, format, transports } = require("winston");
const config = require("./config");

let logLevel;
switch (config.debug) {
  case 1:
    logLevel = "verbose";
    break;
  case 2:
    logLevel = "debug";
    break;
  case 3:
    logLevel = "silly";
    break;
  default:
    logLevel = "info";
}

const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "sftp-server" },
  transports: [new transports.File({ filename: config.logFile })],
});

//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

function debugLow(name, msgs, extra) {
  let m = Array.isArray(msgs) ? msgs.join("\n ") : msgs;
  extra ? logger.verbose(`${name}: ${m}`, extra) : logger.verbose(`${name}: ${m}`);
}

function debugMedium(name, msgs, extra) {
  let m = Array.isArray(msgs) ? msgs.join("\n  ") : msgs;
  extra ? logger.debug(`${name}: ${m}`, extra) : logger.debug(`${name}: ${m}`);
}

function debugHigh(name, msgs, extra) {
  let m = Array.isArray(msgs) ? msgs.join("\n  ") : msgs;
  extra ? logger.silly(`${name}: ${m}`, extra) : logger.debug(`${name}: ${m}`);
}

module.exports = {
  logger,
  debugLow,
  debugMedium,
  debugHigh,
};
