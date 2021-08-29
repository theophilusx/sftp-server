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

const makeHandle = handleFactory();
let handles = new Map();

function opendir(sftp) {
  return async (reqid, path) => {
    log.debug("opendir", `SFTP opendir event: RQID: ${reqid} Path: ${path}`);

    try {
      let dirPath = path || root;
      if (!dirPath.startsWith("/")) {
        dirPath = join(root, dirPath);
      }
      if (!dirPath.startsWith(root)) {
        log.debug("opendir", `Invalid directory path ${dirPath}`);
        sftp.status(reqid, STATUS_CODE.FAILURE, `Invalid directory path: ${dirPath}`);
      } else {
        let absPath = await files.realpath(dirPath);
        let stats = await files.stat(absPath);
        if (stats.isDirectory()) {
          let handle = makeHandle(handleType.DIR, absPath);
          handles.set(`handle-${handle.id}`, handle);
          sftp.handle(reqid, Buffer.from(`handle-${handle.id}`));
        } else {
          log.debug("opendir", `${path} is not a directory`);
          sftp.status(reqid, STATUS_CODE.FAILURE, `${path} is not a directory`);
        }
      }
    } catch (err) {
      log.debug("opendir", `Error: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function readdir(sftp) {
  return async (reqid, buffer) => {
    log.debug("readdir", [
      `SFTP readdir event: RQID: ${reqid}`,
      `handle is ${buffer.toString()}`,
    ]);

    try {
      let handleId = buffer.toString();
      let handle = handles.get(handleId);
      if (!handle) {
        log.debug("readdir", `Unknown handle ID ${handleId}`);
        sftp.status(reqid, STATUS_CODE.FAILURE, `Unknown handle ID ${handleId}`);
      } else if (handle.type !== handleType.DIR) {
        log.debug("Bad handle type");
        sftp.status(reqid, STATUS_CODE.FAILURE, "Bad handle type");
      } else if (handle.status === handleState.CLOSE) {
        log.debug("readdir", "handle is already closed");
        sftp.status(reqid, STATUS_CODE.FAILURE, "handle is already closed");
      } else if (handle.state === handleState.COMPLETE) {
        sftp.status(reqid, STATUS_CODE.EOF);
      } else {
        let fileData = await files.getDirData(handle.path);
        handle.state = handleState.COMPLETE;
        handles.set(handleId, handle);
        sftp.name(reqid, fileData);
      }
      return true;
    } catch (err) {
      log.debug("readdir", `Error: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.toString());
      return true;
    }
  };
}

function close(sftp) {
  return async (reqid, buffer) => {
    log.debug("close", [`SFTP close reqid ${reqid}`, `handle: ${buffer.toString()}`]);
    let handleId = buffer.toString();
    let handle = handles.get(handleId);
    if (!handle) {
      log.debug("close", `Unknown handle ID ${handleId}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, `Unknown handle ID ${handleId}`);
    } else if (handle.type === handleType.DIR) {
      handle.state = handleState.CLOSE;
      handles.set(handleId, handle);
      sftp.status(reqid, STATUS_CODE.OK);
    } else {
      if (handle.fd !== -1) {
        await files.close(handle.fd);
      }
      handle.state = handleState.CLOSE;
      handle.fd = -1;
      handle.offset = 0;
      sftp.status(reqid, STATUS_CODE.OK);
    }
    return true;
  };
}

function lstat(sftp) {
  return async (reqid, filePath) => {
    log.debug("lstat", [`SFTP lstat REQID ${reqid}`, `filePath: ${filePath}`]);

    try {
      if (!filePath.startsWith("/")) {
        filePath = join(root, filePath);
      }
      if (!filePath.startsWith(root)) {
        log.debug("lstat", `Invalid file path ${filePath}`);
        sftp.status(reqid, STATUS_CODE.FAILURE, `Invalid file path ${filePath}`);
      } else {
        let attrs = await files.lstat(filePath);
        sftp.attrs(reqid, attrs);
      }
    } catch (err) {
      log.debug("lstat", `Error: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function stat(sftp) {
  return async (reqid, filePath) => {
    log.debug("stat", [`SFTP lstat REQID ${reqid}`, `filePath: ${filePath}`]);

    try {
      if (!filePath.startsWith("/")) {
        filePath = join(root, filePath);
      }
      if (!filePath.startsWith(root)) {
        log.debug("stat", `Invalid file path ${filePath}`);
        sftp.status(reqid, STATUS_CODE.FAILURE, `Invalid file path ${filePath}`);
      } else {
        let attrs = await files.stat(filePath);
        sftp.attrs(reqid, attrs);
      }
    } catch (err) {
      log.debug("stat", `Error: ${err.message}`);
      console.log(`stat: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function realpath(sftp) {
  return async (reqid, filePath) => {
    log.debug("realpath", `SFTP realpath REQID: ${reqid} Path: ${filePath}`);

    try {
      let targetPath = filePath || root;
      if (!targetPath.startsWith("/")) {
        targetPath = join(root, targetPath);
      }
      if (!targetPath.startsWith(root)) {
        log.debug("realpath", `realpath: Bad path ${targetPath}`);
        sftp.status(reqid, STATUS_CODE.FAILURE, `Bad path ${targetPath}`);
      } else {
        let absPath = await files.realpath(targetPath);
        log.debug("realpath", `Absolute path = ${absPath}`);
        sftp.name(reqid, [{ filename: absPath }]);
      }
      return true;
    } catch (err) {
      log.debug("realpath", `Error: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
  };
}

// function open(sftp) {
//   return async function(reqid, filename, flags, attrs) {
//     console.log(`SFTP open REQID ${reqid}`);
//     console.log(
//       `file: ${filename} flags ${SFTPStream.flagsToString(flags)} ` +
//         `attrs: ${JSON.stringify(attrs)}`
//     );
//     try {
//       let filePath = filename;
//       if (!filePath.startsWith('/')) {
//         filePath = path.join(root, filePath);
//       }
//       if (!filePath.startsWith(root)) {
//         sftp.status(reqid, STATUS_CODE.FAILURE, `Bad file path ${filePath}`);
//       } else {
//         let absPath = await files.realpath(filePath);
//         let stats = await files.lstat(filePath);
//         if (stats.isFile()) {
//           let fd = await files.open(filePath, SFTPStream.flagsToString(flags));
//           let handle = makeHandle(
//             handleType.FILE,
//             absPath,
//             fd,
//             SFTPStream.flagsToString(flags),
//             0
//           );
//           handles.set(`handle-${handle.id}`, handle);
//           sftp.handle(reqid, Buffer.from(`handle-${handle.id}`));
//         } else {
//           sftp.status(
//             reqid,
//             STATUS_CODE.FAILURE,
//             `${absPath} is not a regular file`
//           );
//         }
//       }
//     } catch (err) {
//       console.log(`open: ${err.message}`);
//       sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
//     }
//     return true;
//   };
// }

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
    log.debug("write", [
      `SFTP write REQID: ${reqid}`,
      `Handle ID: ${buffer.toString()} Offset: ${offset} Length: ${data.length}`,
    ]);

    try {
      sftp.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
    } catch (err) {
      log.debug("write", `Error: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function noop(sftp, name) {
  return (reqid) => {
    log.debug("noop", `SFTP NOOP ${name} REQID: ${reqid}`);
    sftp.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
    return true;
  };
}

module.exports = {
  opendir,
  readdir,
  close,
  lstat,
  stat,
  realpath,
  // open,
  // read,
  write,
  noop,
};
