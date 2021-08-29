const { authHandler } = require("./auth");
const { sessionHandler } = require("./session");
const log = require("./logger");

function handshakeHandler() {
  return (negotiated) => {
    log.debug("handshakeHandler", [
      "Handshake negotiated",
      `Key Exchange: ${negotiated.kex}`,
      `Server Host Key: ${negotiated.srvHostKey}`,
      `Client: Cipher: ${negotiated.cs.cipher}`,
      `        Mac: ${negotiated.cs.mac}`,
      `        Compress: ${negotiated.cs.compress}`,
      `        Lang: ${negotiated.cs.lang}`,
      `Server: Cipher: ${negotiated.sc.cipher}`,
      `        Mac: ${negotiated.sc.mac}`,
      `        Compress: ${negotiated.sc.compress}`,
      `        Lang: ${negotiated.sc.lang}`,
    ]);
  };
}

function rekeyHandler() {
  return () => {
    log.silly("rekeyHandler", "A rekey event has completed");
  };
}

function closeHandler() {
  return () => {
    log.debug("closeHandler", "The client connection has been closed");
  };
}

function endHandler() {
  return () => {
    log.debug("endHandler", "The client connection has ended");
  };
}

function errorHandler(client) {
  return (err) => {
    log.error("errorHandler", JSON.stringify(err, null, " "));
    client.end();
  };
}

function clientHandler() {
  return (client) => {
    log.debug("clientHandler", "Client connected");
    client
      .on("authentication", authHandler())
      .on("handshake", handshakeHandler())
      .on("rekey", rekeyHandler())
      .on("close", closeHandler())
      .on("end", endHandler())
      .on("error", errorHandler(client))
      .on("ready", () => {
        log.info("readyHandler", "Client authenticated!");
        client.on("session", sessionHandler(client));
      });
  };
}

module.exports = {
  clientHandler,
};
