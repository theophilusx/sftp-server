const listeners = require("./listeners");
const log = require("./logger");

function sessionHandler(client) {
  return (accept) => {
    let session = accept();
    log.debug("sessionHandler", "Session started");
    session
      .on("close", closeSessionLogger())
      .on("end", endSessionLogger(client))
      .on("error", sessionErrorHandler(client))
      .on("sftp", sftpHandler())
      .on("env", sessionEnvHandler());
  };
}

function sftpHandler() {
  return (accept) => {
    log.debug("sftpHandler", "SFTP Session Started");
    let sftp = accept();
    sftp
      .on("OPEN", listeners.open(sftp))
      .on("READ", listeners.read(sftp))
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

function closeSessionLogger() {
  return () => {
    log.debug("closeSessionLogger", "The client session has been closed");
  };
}

function endSessionLogger(client) {
  return () => {
    log.debug("endSessionLogger", "The client session has ended");
    client.end();
  };
}

function sessionErrorHandler(client) {
  return (err) => {
    log.error("sessionErrorHandler", JSON.stringify(err, null, " "));
    client.end();
  };
}

function sessionEnvHandler() {
  return (accept, reject, info) => {
    try {
      log.debug("sessionEnvHandler", `Key: ${info.key} Value: ${info.value}`);
      process.env[info.key] = info.value;
      accept ? accept() : null;
    } catch (err) {
      log.error("sessionEnvHandler", JSON.stringify(err, null, " "));
      reject ? reject() : null;
    }
  };
}

module.exports = {
  sessionHandler,
};
