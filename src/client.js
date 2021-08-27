const { authHandler } = require("./auth");
const { sessionHandler } = require("./session");
const { debugLow, debugMedium, logger } = require("./logger");

function handshakeHandler() {
  return (negotiated) => {
    debugMedium("handshakeHandler", [
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
    debugMedium("rekeyHandler", "A rekey event has completed");
  };
}

function closeHandler() {
  return () => {
    debugMedium("closeHandler", "The client connection has been closed");
  };
}

function endHandler() {
  return () => {
    debugMedium("endHandler", "The client connection has ended");
  };
}

function errorHandler(client) {
  return (err) => {
    logger.error("errorHandler: ", err);
    client.end();
  };
}

function clientHandler() {
  return (client) => {
    debugLow("clientHandler", "Client connected");
    client
      .on("authentication", authHandler())
      .on("handshake", handshakeHandler())
      .on("rekey", rekeyHandler())
      .on("close", closeHandler())
      .on("end", endHandler())
      .on("error", errorHandler(client))
      .on("ready", () => {
        debugLow("readyHandler", "Client authenticated!");
        client.on("session", sessionHandler(client));
      });
  };
}

module.exports = {
  clientHandler,
};
