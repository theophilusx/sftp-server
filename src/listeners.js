'use strict';

const path = require('path');
const ssh2 = require('ssh2');
const files = require('./files');
const {handleState, handleType, handleFactory} = require('./handle');
const {SFTPStream} = require('ssh2-streams');

//const OPEN_MODE = ssh2.SFTP_OPEN_MODE;
const makeHandle = handleFactory();
const STATUS_CODE = ssh2.SFTP_STATUS_CODE;
const root = path.join(__dirname, '../data');
let handles = new Map();

function opendirListener(sftp) {
  return async function(reqid, path) {
    console.log(`SFTP opendir event: RQID: ${reqid}`);
    console.log(`path: ${path}`);

    try {
      let dirPath = path || root;
      if (!dirPath.startsWith('/')) {
        dirPath = path.join(root, dirPath);
      }
      if (!dirPath.startsWith(root)) {
        sftp.status(reqid, STATUS_CODE.FAILURE, 'Invalid directory path');
      } else {
        let absPath = await files.realpath(dirPath);
        let stats = await files.stat(absPath);
        if (stats.isDirectory()) {
          let handle = makeHandle(handleType.DIR, absPath);
          handles.set(`handle-${handle.id}`, handle);
          sftp.handle(reqid, Buffer.from(`handle-${handle.id}`));
        } else {
          sftp.status(reqid, STATUS_CODE.FAILURE, `${path} is not a directory`);
        }
      }
    } catch (err) {
      console.log(`opendir: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function readdirListener(sftp) {
  return async function(reqid, buffer) {
    console.log(`SFTP readdir event: RQID: ${reqid}`);
    console.log(`handle is ${buffer.toString()}`);

    try {
      let handleId = buffer.toString();
      let handle = handles.get(handleId);
      if (!handle) {
        sftp.status(
          reqid,
          STATUS_CODE.FAILURE,
          `Unknown handle ID ${handleId}`
        );
      } else if (handle.type !== handleType.DIR) {
        sftp.status(reqid, STATUS_CODE.FAILURE, 'Bad handle type');
      } else if (handle.status === handleState.CLOSE) {
        sftp.status(reqid, STATUS_CODE.FAILURE, 'handle is already closed');
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
      console.log(`readdir: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.toString());
      return true;
    }
  };
}

function closeListener(sftp) {
  return async function(reqid, buffer) {
    console.log(`SFTP close reqid ${reqid}`);
    console.log(`handle: ${buffer.toString()}`);
    let handleId = buffer.toString();
    let handle = handles.get(handleId);
    if (!handle) {
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

function lstatListener(sftp) {
  return async function(reqid, filePath) {
    console.log(`SFTP lstat REQID ${reqid}`);
    console.log(`filePath: ${filePath}`);

    try {
      if (!filePath.startsWith('/')) {
        filePath = path.join(root, filePath);
      }
      if (!filePath.startsWith(root)) {
        sftp.status(
          reqid,
          STATUS_CODE.FAILURE,
          `Invalid file path ${filePath}`
        );
      } else {
        let attrs = await files.lstat(filePath);
        sftp.attrs(reqid, attrs);
      }
    } catch (err) {
      console.log(`lstat: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function statListener(sftp) {
  return async function(reqid, filePath) {
    console.log(`SFTP lstat REQID ${reqid}`);
    console.log(`filePath: ${filePath}`);

    try {
      if (!filePath.startsWith('/')) {
        filePath = path.join(root, filePath);
      }
      if (!filePath.startsWith(root)) {
        sftp.status(
          reqid,
          STATUS_CODE.FAILURE,
          `Invalid file path ${filePath}`
        );
      } else {
        let attrs = await files.stat(filePath);
        sftp.attrs(reqid, attrs);
      }
    } catch (err) {
      console.log(`stat: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function realpathListener(sftp) {
  return async function(reqid, filePath) {
    console.log(`SFTP realpath REQID: ${reqid}`);
    console.log(`Path: ${filePath}`);

    try {
      let targetPath = filePath || root;
      if (!targetPath.startsWith('/')) {
        targetPath = path.join(root, targetPath);
      }
      if (!targetPath.startsWith(root)) {
        sftp.status(reqid, STATUS_CODE.FAILURE, `Bad path ${targetPath}`);
      } else {
        let absPath = await files.realpath(targetPath);
        sftp.name(reqid, [absPath]);
      }
    } catch (err) {
      console.log(`realpath: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function openListener(sftp) {
  return async function(reqid, filename, flags, attrs) {
    console.log(`SFTP open REQID ${reqid}`);
    console.log(
      `file: ${filename} flags ${SFTPStream.flagsToString(flags)} ` +
        `attrs: ${JSON.stringify(attrs)}`
    );
    try {
      let filePath = filename;
      if (!filePath.startsWith('/')) {
        filePath = path.join(root, filePath);
      }
      if (!filePath.startsWith(root)) {
        sftp.status(reqid, STATUS_CODE.FAILURE, `Bad file path ${filePath}`);
      } else {
        let absPath = await files.realpath(filePath);
        let stats = await files.lstat(filePath);
        if (stats.isFile()) {
          let fd = await files.open(filePath, SFTPStream.flagsToString(flags));
          let handle = makeHandle(
            handleType.FILE,
            absPath,
            fd,
            SFTPStream.flagsToString(flags),
            0
          );
          handles.set(`handle-${handle.id}`, handle);
          sftp.handle(reqid, Buffer.from(`handle-${handle.id}`));
        } else {
          sftp.status(
            reqid,
            STATUS_CODE.FAILURE,
            `${absPath} is not a regular file`
          );
        }
      }
    } catch (err) {
      console.log(`open: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

function readListener(sftp) {
  return async function(reqid, buffer, offset, length) {
    console.log(`SFTP read REQID ${reqid}`);
    console.log(
      `handle: ${buffer.toString()} offset: ${offset} length: ${length}`
    );

    try {
      let handle = handles.get(buffer.toString());
      if (!handle) {
        sftp.status(
          reqid,
          STATUS_CODE.FAILURE,
          `Bad handle ID ${buffer.toString()}`
        );
      } else {
        if (handle.state === handleState.COMPLETE) {
          console.log('reading completed');
          sftp.status(reqid, STATUS_CODE.EOF);
        } else {
          console.log(`handle offset: ${handle.offset}`);
          console.log(`Request offset: ${offset}`);
          console.log(`Request length: ${length}`);
          let [bytesRead, buf] = await files.read(handle.fd, length);
          if (bytesRead === 0) {
            console.log('no data read - assume complete');
            handle.state = handleState.COMPLETE;
            handles.set(`handle-${handle.id}`, handle);
            sftp.status(reqid, STATUS_CODE.EOF);
          } else {
            console.log(`Bytres Read; ${bytesRead}`);
            let data = Buffer.alloc(21);
            buf.copy(data, 0, 0, bytesRead);
            console.log(`data length: ${data.length}`);
            handle.offset += bytesRead;
            handles.set(`handle-${handle.id}`, handle);
            sftp.data(reqid, data);
          }
        }
      }
    } catch (err) {
      console.log(`read: ${err.message}`);
      sftp.status(reqid, STATUS_CODE.FAILURE, err.message);
    }
    return true;
  };
}

module.exports = {
  opendirListener,
  readdirListener,
  closeListener,
  lstatListener,
  statListener,
  realpathListener,
  openListener,
  readListener
};
