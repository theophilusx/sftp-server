const { authHandler } = require("./auth");
const { sessionHandler } = require("./session");
const { DEBUG_LEVEL } = require("./constants");
const { debugMsg } = require("./utils");

function handshakeHandler() {
  return (negotiated) => {
    debugMsg(DEBUG_LEVEL.MEDIUM, "handshakeHandler", [
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
    debugMsg(DEBUG_LEVEL.MEDIUM, "rekeyHandler", "A rekey event has completed");
  };
}

function closeHandler() {
  return () => {
    debugMsg(DEBUG_LEVEL.MEDIUM, "closeHandler", "The client connection has been closed");
  };
}

function endHandler() {
  return () => {
    debugMsg(DEBUG_LEVEL.MEDIUM, "endHandler", "The client connection has ended");
  };
}

function errorHandler(client) {
  return (err) => {
    debugMsg(DEBUG_LEVEL.MEDIUM, "errorHandler", `Client Error: ${err.message}`);
    console.error("A client error event has fired");
    console.error(`Error: ${err.message}`);
    client.end();
  };
}

function clientHandler() {
  return (client) => {
    debugMsg(DEBUG_LEVEL.LOW, "clientHandler", "Client connected");
    client
      .on("authentication", authHandler())
      .on("handshake", handshakeHandler())
      .on("rekey", rekeyHandler())
      .on("close", closeHandler())
      .on("end", endHandler())
      .on("error", errorHandler(client))
      .on("ready", () => {
        debugMsg(DEBUG_LEVEL.LOW, "readyHandler", "Client authenticated!");
        client.on("session", sessionHandler(client));
      });
  };
}

module.exports = {
  clientHandler,
};
