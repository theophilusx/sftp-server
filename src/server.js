const { readFileSync } = require("fs");
const { Server } = require("ssh2");
const { clientHandler } = require("./client");
const { debugMsg, config } = require("./utils");
const { DEBUG_LEVEL } = require("./constants");

function connectionHandler() {
  return (_client, info) => {
    debugMsg(DEBUG_LEVEL.HIGH, "connectionHandler", [
      `A new connection detected from ${info.ip}:${info.port}`,
      `Family: ${info.family}`,
      `Raw Ident: ${info.header.identRaw}`,
      `Version: Protocol: ${info.header.versions.protocol} Software: ${info.header.versions.software}`,
      info.header.comments,
    ]);
  };
}

new Server(
  {
    hostKeys: [readFileSync(config.keyFile)],
  },
  clientHandler()
)
  .listen(config.port, config.bindAddress, () => {
    console.log(`Listening on ${config.bindAddress}:${config.port}`);
  })
  .on("connection", connectionHandler());
