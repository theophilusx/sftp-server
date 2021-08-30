const { authenticateClient } = require("./auth");
const { sessionHandler } = require("./session");
const log = require("./logger");

function clientHandler() {
  return (client) => {
    log.debug("clientHandler", "Client connected");
    client
      .on("authentication", authenticateClient())
      .on("handshake", handshakeLogger())
      .on("rekey", rekeyLogger())
      .on("close", closeClientLogger())
      .on("end", endClientLogger())
      .on("error", clientErrorHandler(client))
      .on("ready", () => {
        log.info("ready", "Opening client session");
        client.on("session", sessionHandler(client));
      });
  };
}

function handshakeLogger() {
  return (negotiated) => {
    log.debug("handshakeLogger", [
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

function rekeyLogger() {
  return () => {
    log.silly("rekeyLogger", "A rekey event has completed");
  };
}

function closeClientLogger() {
  return () => {
    log.debug("closeClientLogger", "The client connection has been closed");
  };
}

function endClientLogger() {
  return () => {
    log.debug("endClientLogger", "The client connection has ended");
  };
}

function clientErrorHandler(client) {
  return (err) => {
    log.error("clientErrorHandler", JSON.stringify(err, null, " "));
    client.end();
  };
}

module.exports = {
  clientHandler,
};
