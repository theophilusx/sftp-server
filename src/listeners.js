const { join } = require("path");
const {
  utils: {
    sftp: { STATUS_CODE },
  },
} = require("ssh2");
const files = require("./files");
const { handleState, handleType, handleFactory } = require("./handle");
const config = require("./config");
const log = require("./logger");

const root = config.root;
let cwd = root;

const makeHandle = handleFactory();
let handles = new Map();

function opendir(sftp) {
  return async (reqid, path) => {
    log.debug("opendir", `Reqid: ${reqid} Path: ${path}`);

    try {
      let absPath = normalisePath(path);
      let stats = await files.stat(absPath);
      if (stats.isDirectory()) {
        let handle = makeHandle(handleType.DIR, absPath);
        handles.set(`handle-${handle.id}`, handle);
        log.debug("opendir", `Reqid: ${reqid} Handle: handle-${handle.id}`);
        sftp.handle(reqid, Buffer.from(`handle-${handle.id}`));
      } else {
        log.debug("opendir", `Reqid: ${reqid} ${path} is not a directory`);
        sftp.status(reqid, STATUS_CODE.FAILURE, `${path} is not a directory`);
      }
    } catch (err) {
      log.error("opendir", `Reqid: ${reqid} ${JSON.stringify(err, null, " ")}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function readdir(sftp) {
  return async (reqid, buffer) => {
    log.debug("readdir", `Reqid: ${reqid} handle: ${buffer.toString()}`);

    try {
      let handleId = buffer.toString();
      let handle = handles.get(handleId);
      if (!handle) {
        log.debug("readdir", `Reqid: ${reqid} Unknown handle ID`);
        sftp.status(reqid, STATUS_CODE.FAILURE, "Unknown handle ID");
      } else if (handle.type !== handleType.DIR) {
        log.debug("readdir", `Reqid ${reqid} Handle not a directory`);
        sftp.status(reqid, STATUS_CODE.FAILURE, "Not a directory handle");
      } else if (handle.status === handleState.CLOSE) {
        log.debug("readdir", `Reqid: ${reqid} Handle already closed`);
        sftp.status(reqid, STATUS_CODE.FAILURE, "Handle already closed");
      } else if (handle.state === handleState.COMPLETE) {
        log.debug("readdir", `Reqid: ${reqid} Handle completed`);
        sftp.status(reqid, STATUS_CODE.EOF);
      } else {
        let dirData = await files.getDirData(handle.path);
        handle.state = handleState.COMPLETE;
        handles.set(handleId, handle);
        log.debug("readdir", `Reqid ${reqid} Returning data to client`);
        sftp.name(reqid, dirData);
      }
    } catch (err) {
      log.error("readdir", `Reqid: ${reqid} ${JSON.stringify(err, null, " ")}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function close(sftp) {
  return async (reqid, buffer) => {
    log.debug("close", `Reqid ${reqid}`, `handle: ${buffer.toString()}`);
    let handleId = buffer.toString();
    let handle = handles.get(handleId);
    if (!handle) {
      log.debug("close", `Reqid: ${reqid} Unknown handle ID ${handleId}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, `Unknown handle ID ${handleId}`);
    } else if (handle.type === handleType.DIR) {
      handle.state = handleState.CLOSE;
      handles.set(handleId, handle);
      log.debug("close", `Reqid: ${reqid} Handle: ${handleId} closed`);
      sftp.status(reqid, STATUS_CODE.OK);
    } else {
      if (handle.fd !== -1) {
        await files.close(handle.fd);
      }
      handle.state = handleState.CLOSE;
      handle.fd = -1;
      handle.offset = 0;
      log.debug("close", `Reqid: ${reqid} Handle: ${handleId} closed`);
      sftp.status(reqid, STATUS_CODE.OK);
    }
    return true;
  };
}

function lstat(sftp) {
  return async (reqid, filePath) => {
    log.debug("lstat", `Reqid: ${reqid} Path: ${filePath}`);

    try {
      let absPath = normalisePath(filePath);
      let attrs = await files.lstat(absPath);
      sftp.attrs(reqid, attrs);
    } catch (err) {
      log.error("lstat", `Reqid: ${reqid} ${JSON.stringify(err, null, " ")}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function stat(sftp) {
  return async (reqid, filePath) => {
    log.debug("stat", `Reqid: ${reqid} Path: ${filePath}`);

    try {
      let absPath = normalisePath(filePath);
      let attrs = await files.stat(absPath);
      sftp.attrs(reqid, attrs);
    } catch (err) {
      log.error("stat", `Reqid: ${reqid} ${JSON.stringify(err, null, " ")}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function realpath(sftp) {
  return async (reqid, filePath) => {
    log.debug("realpath", `Reqid: ${reqid} Path: ${filePath}`);

    try {
      let absPath = normalisePath(filePath);
      absPath = await files.realpath(absPath);
      log.debug("realpath", `Reqid: ${reqid} Absolute path: ${absPath}`);
      sftp.name(reqid, [{ filename: absPath }]);
      return true;
    } catch (err) {
      log.error("realpath", `Reqid: ${reqid} ${JSON.stringify(err, null, " ")}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
  };
}

function open(sftp) {
  return async function (reqid, filename, flags, attrs) {
    log.debug(
      "open",
      `Reqid: ${reqid} file: ${filename} flags ${sftp.flagsToString(flags)} ` +
        `attrs: ${JSON.stringify(attrs)}`
    );
    try {
      let filePath = normalisePath(filename);
      let absPath = await files.realpath(filePath);
      let stats = await files.lstat(filePath);
      if (stats.isFile()) {
        let fd = await files.open(absPath, sftp.flagsToString(flags));
        let handle = makeHandle(
          handleType.FILE,
          absPath,
          fd,
          sftp.flagsToString(flags),
          0
        );
        handles.set(`handle-${handle.id}`, handle);
        log.debug("open", `Reqid: ${reqid} Hangle: handle-${handle.id}`);
        sftp.handle(reqid, Buffer.from(`handle-${handle.id}`));
      } else {
        log.debug("open", `Reqid: ${reqid} ${absPath} is not a regular file`);
        sftp.status(reqid, STATUS_CODE.FAILURE, `${absPath} is not a regular file`);
      }
      return true;
    } catch (err) {
      console.log(`Reqid: ${reqid} ${JSON.stringify(err, null, " ")}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
  };
}

// function read(sftp) {
//   return async function(reqid, buffer, offset, length) {
//     console.log(`SFTP read REQID ${reqid}`);
//     console.log(
//       `handle: ${buffer.toString()} offset: ${offset} length: ${length}`
//     );

//     try {
//       let handle = handles.get(buffer.toString());
//       if (!handle) {
//         sftp.status(
//           reqid,
//           STATUS_CODE.FAILURE,
//           `Bad handle ID ${buffer.toString()}`
//         );
//       } else {
//         if (handle.state === handleState.COMPLETE) {
//           console.log('reading completed');
//           sftp.status(reqid, STATUS_CODE.EOF);
//         } else {
//           console.log(`handle offset: ${handle.offset}`);
//           console.log(`Request offset: ${offset}`);
//           console.log(`Request length: ${length}`);
//           let [bytesRead, buf] = await files.read(handle.fd, length);
//           if (bytesRead === 0) {
//             console.log('no data read - assume complete');
//             handle.state = handleState.COMPLETE;
//             handles.set(`handle-${handle.id}`, handle);
//             sftp.status(reqid, STATUS_CODE.EOF);
//           } else {
//             console.log(`Bytres Read; ${bytesRead}`);
//             let data = Buffer.alloc(21);
//             buf.copy(data, 0, 0, bytesRead);
//             console.log(`data length: ${data.length}`);
//             handle.offset += bytesRead;
//             handles.set(`handle-${handle.id}`, handle);
//             sftp.data(reqid, data);
//           }
//         }
//       }
//     } catch (err) {
//       console.log(`read: ${err.message}`);
//       sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
//     }
//     return true;
//   };
// }

function write(sftp) {
  return async (reqid, buffer, offset, data) => {
    log.debug(
      "write",
      `Reqid: ${reqid} Handle ID: ${buffer.toString()} Offset: ${offset} Length: ${
        data.length
      }`
    );

    try {
      sftp.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
    } catch (err) {
      log.error("write", `Reqid: ${reqid} ${JSON.stringify(err, null, " ")}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function noop(sftp, name) {
  return (reqid) => {
    log.debug("noop", `${name} Reqid: ${reqid}`);
    sftp.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
    return true;
  };
}

function normalisePath(filePath) {
  let path = !filePath.startsWith(root) ? join(cwd, filePath) : filePath;
  if (!path.startsWith(root)) {
    throw new Error(`Bad path: ${path}`);
  }
  return path;
}

module.exports = {
  opendir,
  readdir,
  close,
  lstat,
  stat,
  realpath,
  open,
  // read,
  write,
  noop,
  normalisePath,
};
