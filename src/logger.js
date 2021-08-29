const { createLogger, format, transports } = require("winston");
const config = require("./config");

const { combine, timestamp, printf } = format;
const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    myFormat
  ),
  //defaultMeta: { service: "sftp-server" },
  transports: [new transports.File({ filename: config.logFile })],
});

//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), myFormat),
    })
  );
}

logger.info(`config: ${JSON.stringify({ ...config, password: "********" }, null, " ")}`);

function debug(name, msgs, extra) {
  let m = Array.isArray(msgs) ? msgs.join("\n ") : msgs;
  extra ? logger.debug(`${name}: ${m}`, extra) : logger.debug(`${name}: ${m}`);
}

function silly(name, msgs, extra) {
  let m = Array.isArray(msgs) ? msgs.join("\n  ") : msgs;
  extra ? logger.silly(`${name}: ${m}`, extra) : logger.silly(`${name}: ${m}`);
}

function verbose(name, msgs, extra) {
  let m = Array.isArray(msgs) ? msgs.join("\n  ") : msgs;
  extra ? logger.verbose(`${name}: ${m}`, extra) : logger.verbose(`${name}: ${m}`);
}

function error(name, msgs, extra) {
  let m = Array.isArray(msgs) ? msgs.join("\n  ") : msgs;
  extra ? logger.error(`${name}: ${m}`, extra) : logger.error(`${name}: ${m}`);
}

function info(name, msgs, extra) {
  let m = Array.isArray(msgs) ? msgs.join("\n  ") : msgs;
  extra ? logger.info(`${name}: ${m}`, extra) : logger.info(`${name}: ${m}`);
}

module.exports = {
  error,
  info,
  verbose,
  debug,
  silly,
};
