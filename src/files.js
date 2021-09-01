const fs = require("fs");
const path = require("path");
const moment = require("moment");
const log = require("./logger");

const fileModeMasks = {
  typeMask: 0o170000,
  socket: 0o140000,
  link: 0o120000,
  file: 0o100000,
  block: 0o60000,
  dir: 0o40000,
  character: 0o20000,
  fifo: 0o10000,
};

const filePermissionMask = {
  suid: 0o4000,
  guid: 0o2000,
  sticky: 0o1000,
  user_r: 0o400,
  user_w: 0o200,
  user_x: 0o100,
  grp_r: 0o40,
  grp_w: 0o20,
  grp_x: 0o10,
  othr_r: 0o4,
  othr_w: 0o2,
  othr_x: 0o1,
};

// This could be done easily using the various stats.isXXX() functions.
// but instead we are doing it 'old school' using the raw mode number
// and various bit masks. Just note that the fs.stats object has functions
// for each of these, which are probably more robust on different platforms.
// The below works on Linux. Not sure about platforms like Windows.
function getFileType(mode) {
  let mask = mode & fileModeMasks.typeMask;

  switch (mask) {
    case fileModeMasks.socket:
      return "s";
    case fileModeMasks.link:
      return "l";
    case fileModeMasks.file:
      return "-";
    case fileModeMasks.block:
      return "b";
    case fileModeMasks.dir:
      return "d";
    case fileModeMasks.character:
      return "c";
    case fileModeMasks.fifo:
      return "p";
    default:
      log.debug("getFileType", `Unrecognised file mode ${mode}`);
      return "?";
  }
}

function getPermissions(mode) {
  let user = "";
  let group = "";
  let other = "";

  user += mode & filePermissionMask.user_r ? "r" : "-";
  user += mode & filePermissionMask.user_w ? "w" : "-";
  user += mode & filePermissionMask.user_x ? "x" : "-";

  group += mode & filePermissionMask.grp_r ? "r" : "-";
  group += mode & filePermissionMask.grp_w ? "w" : "-";
  group += mode & filePermissionMask.grp_x ? "x" : "-";

  other += mode & filePermissionMask.othr_r ? "r" : "-";
  other += mode & filePermissionMask.othr_w ? "w" : "-";
  other += mode & filePermissionMask.othr_x ? "x" : "-";

  if (mode & filePermissionMask.suid) {
    user = user[2] === "x" ? user.slice(0, 2) + "s" : user.slice(0, 2) + "S";
  }

  if (mode & filePermissionMask.guid) {
    group = group[2] === "x" ? group.slice(0, 2) + "s" : group.slice(0, 2) + "S";
  }

  if (mode & filePermissionMask.sticky) {
    user =
      user[2] === "x" || user[2] === "s"
        ? user.slice(0, 2) + "t"
        : user.slice(0, 2) + "T";
  }
  log.debug("getPermissions", `${mode} permissions = ${user}${group}${other}`);
  return `${user}${group}${other}`;
}

function getTimeString(timeMs) {
  let now = moment();
  let time = moment(timeMs);
  if (time.format("YYYY") === now.format("YYYY")) {
    log.debug("getTimeString", `${timeMs} ms = ${time.format("MMM DD HH:mm")}`);
    return time.format("MMM DD HH:mm");
  }
  log.debug("getTimeString", `${timeMs} ms = ${time.format("MMM DD YYYY")}`);
  return time.format("MMM DD YYYY");
}

function realpath(filePath) {
  return new Promise((resolve, reject) => {
    fs.realpath(filePath, (err, absPath) => {
      if (err) {
        log.debug("realpath", `Error: ${err.message}`);
        reject(new Error(`realpath: ${err.message}`));
      } else {
        resolve(absPath);
      }
    });
  });
}

function lstat(dir) {
  return new Promise((resolve, reject) => {
    fs.lstat(dir, (err, stats) => {
      if (err) {
        log.error("lstat", JSON.stringify(err, null, " "));
        reject(new Error(`lstat: ${err.message}`));
      } else {
        resolve(stats);
      }
    });
  });
}

function stat(dir) {
  return new Promise((resolve, reject) => {
    fs.stat(dir, (err, stats) => {
      if (err) {
        log.error("stat", JSON.stringify(err, null, " "));
        reject(new Error(`stat: ${err.message}`));
      } else {
        resolve(stats);
      }
    });
  });
}

function open(filePath, flags) {
  return new Promise((resolve, reject) => {
    fs.open(filePath, flags, (err, fd) => {
      if (err) {
        log.error("open", JSON.stringify(err, null, " "));
        reject(new Error(`open: ${err.message}`));
      } else {
        log.debug("open", `fd = ${fd}`);
        resolve(fd);
      }
    });
  });
}

function close(fd) {
  return new Promise((resolve, reject) => {
    fs.close(fd, (err) => {
      if (err) {
        log.error("close", JSON.stringify(err, null, " "));
        reject(new Error(`close: ${err.message}`));
      } else {
        resolve(true);
      }
    });
  });
}

function read(fd, length) {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(length);
    fs.read(fd, buf, 0, length, null, (err, bytesRead, buf) => {
      if (err) {
        log.error("read", JSON.stringify(err, null, " "));
        reject(new Error(`read: ${err.message}`));
      } else {
        resolve([bytesRead, buf]);
      }
    });
  });
}

function readdir(dirPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        log.error("readdir", JSON.stringify(err, null, " "));
        reject(new Error(`readdir: ${err.message}`));
      } else {
        resolve(files);
      }
    });
  });
}

async function getFileMetaData(filePath) {
  try {
    let stats = await lstat(filePath);
    let filename = path.parse(filePath).base;
    let fileType = getFileType(stats.mode);
    let perms = getPermissions(stats.mode);
    let mTime = getTimeString(stats.mtimeMs);
    return {
      filename: filename,
      longname:
        `${fileType}${perms} ${stats.nlink} ${stats.uid} ` +
        `${stats.gid} ${stats.size} ${mTime} ${filename}`,
      attrs: {
        mode: stats.mode,
        uid: stats.uid,
        gid: stats.gid,
        size: stats.size,
        atime: stats.atimeMs / 1000,
        mtime: stats.mtimeMs / 1000,
      },
    };
  } catch (err) {
    log.error("getFileMetaData", JSON.stringify(err, null, " "));
    throw new Error(`getFileMetaData: ${err.message}`);
  }
}

async function getDirData(dirPath) {
  try {
    let data = [];
    let files = await readdir(dirPath);
    for (let f of files) {
      let e = await getFileMetaData(path.join(dirPath, f));
      data.push(e);
    }
    return data;
  } catch (err) {
    log.error("getDirData", JSON.stringify(err, null, " "));
    throw new Error(`readDir: ${err.message}`);
  }
}

module.exports = {
  realpath,
  lstat,
  stat,
  open,
  close,
  read,
  readdir,
  getFileMetaData,
  getDirData,
};
