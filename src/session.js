const listeners = require("./listeners");
const { debugLow } = require("./logger");

function sessionCloseHandler() {
  return () => {
    debugLow("sessionCloseHandler", "The client session has been closed");
  };
}

function sessionEndHandler(client) {
  return () => {
    debugLow("sessionEndHandler", "The client session has ended");
    client.end();
  };
}

function sessionErrorHandler(client) {
  return (err) => {
    debugLow("sessionErrorHandler", `Session Error: ${err.message}`);
    console.error(`Session Error: ${err.message}`);
    client.end();
  };
}

function sessionEnvHandler() {
  return (accept, reject, info) => {
    try {
      debugLow("sessionEnvHandler", `Key: ${info.key} Value: ${info.value}`);
      process.env[info.key] = info.value;
      accept ? accept() : null;
    } catch (err) {
      debugLow("sessionEnvHandler", `Error: ${err.message}`);
      reject ? reject() : null;
    }
  };
}

function sftpHandler() {
  return (accept) => {
    debugLow("sftpHandler", "SFTP Session Started");
    let sftp = accept();
    sftp
      //.on('OPEN', listeners.open(sftpStream))
      .on("OPEN", listeners.noop(sftp, "open"))
      //.on("READ", listeners.read(sftpStream))
      .on("READ", listeners.noop(sftp, "read"))
      .on("WRITE", listeners.write(sftp))
      .on("FSTAT", listeners.noop(sftp, "fstat"))
      .on("FSETSTAT", listeners.noop(sftp, "fsetstat"))
      .on("CLOSE", listeners.close(sftp))
      .on("OPENDIR", listeners.opendir(sftp))
      .on("READDIR", listeners.readdir(sftp))
      .on("LSTAT", listeners.lstat(sftp))
      .on("STAT", listeners.stat(sftp))
      .on("REMOVE", listeners.noop(sftp, "remove"))
      .on("RMDIR", listeners.noop(sftp, "rmdir"))
      .on("REALPATH", listeners.realpath(sftp))
      .on("READLINK", listeners.noop(sftp, "readlink"))
      .on("SETSTAT", listeners.noop(sftp, "setstat"))
      .on("MKDIR", listeners.noop(sftp, "mkdir"))
      .on("RENAME", listeners.noop(sftp, "rename"))
      .on("SYMLINK", listeners.noop(sftp, "symlink"));
  };
}

function sessionHandler(client) {
  return (accept) => {
    let session = accept();
    debugLow("sessionHandler", "Session started");
    session
      .on("close", sessionCloseHandler())
      .on("end", sessionEndHandler(client))
      .on("error", sessionErrorHandler(client))
      .on("sftp", sftpHandler())
      .on("env", sessionEnvHandler());
  };
}

module.exports = {
  sessionHandler,
};