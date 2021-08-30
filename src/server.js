const { readFileSync } = require("fs");
const { Server } = require("ssh2");
const { clientHandler } = require("./client");
const config = require("./config");
const log = require("./logger");

log.info(
  "server",
  `config: ${JSON.stringify({ ...config, password: "********" }, null, " ")}`
);

new Server(
  {
    hostKeys: [readFileSync(config.keyFile)],
  },
  clientHandler()
)
  .listen(config.port, config.bindAddress, () => {
    log.info("Service", `Listening on ${config.bindAddress}:${config.port}`);
  })
  .on("connection", connectionLogger());

function connectionLogger() {
  return (_client, info) => {
    log.info(
      "connectinHandler",
      `A new connection detected from ${info.ip}:${info.port}`
    );
    log.debug("connectionHandler", [
      `Family: ${info.family}`,
      `Raw Ident: ${info.header.identRaw}`,
      `Version: Protocol: ${info.header.versions.protocol} Software: ${info.header.versions.software}`,
      info.header.comments,
    ]);
  };
}
