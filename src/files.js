'use srtict';

const fs = require('fs');
const path = require('path');
const moment = require('moment');

const fileModeMasks = {
  typeMask: 0o170000,
  socket: 0o140000,
  link: 0o120000,
  file: 0o100000,
  block: 0o60000,
  dir: 0o40000,
  character: 0o20000,
  fifo: 0o10000
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
  othr_x: 0o1
};

// This could be done easily using the various stats.isXXX() functions.
// but instead we are doing it 'old school' using the raw mode number
// and various bit masks. Just note that the fs.stats object has functions
// for each of these, which are probably more robust on different platforms.
// The below works on Linux. Not sure about platforms like Windows.
function getFileType(mode) {
  let type = '?'; // ? = unknown type
  let mask = mode & fileModeMasks.typeMask;

  if (mask === fileModeMasks.socket) {
    type = 's';
  } else if (mask === fileModeMasks.link) {
    type = 'l';
  } else if (mask === fileModeMasks.file) {
    type = '-';
  } else if (mask === fileModeMasks.block) {
    type = 'b';
  } else if (mask === fileModeMasks.dir) {
    type = 'd';
  } else if (mask === fileModeMasks.character) {
    type = 'c';
  } else if (mask === fileModeMasks.fifo) {
    type = 'p';
  }
  return type;
}

function getPermissions(mode) {
  let user = '';
  let group = '';
  let other = '';

  user += mode & filePermissionMask.user_r ? 'r' : '-';
  user += mode & filePermissionMask.user_w ? 'w' : '-';
  user += mode & filePermissionMask.user_x ? 'x' : '-';

  group += mode & filePermissionMask.grp_r ? 'r' : '-';
  group += mode & filePermissionMask.grp_w ? 'w' : '-';
  group += mode & filePermissionMask.grp_x ? 'x' : '-';

  other += mode & filePermissionMask.othr_r ? 'r' : '-';
  other += mode & filePermissionMask.othr_w ? 'w' : '-';
  other += mode & filePermissionMask.othr_x ? 'x' : '-';

  if (mode & filePermissionMask.suid) {
    if (user[2] === 'x') {
      user = user.slice(0, 2) + 's';
    } else {
      user = user.slice(0, 2) + 'S';
    }
  }

  if (mode & filePermissionMask.guid) {
    if (group[2] === 'x') {
      group = group.slice(0, 2) + 's';
    } else {
      group = group.slice(0, 2) + 'S';
    }
  }

  if (mode & filePermissionMask.sticky) {
    if (user[2] === 'x' || user[2] === 's') {
      user = user.slice(0, 2) + 't';
    } else {
      user = user.slice(0, 2) + 'T';
    }
  }

  return `${user}${group}${other}`;
}

function getTimeString(timeMs) {
  let now = moment();
  let time = moment(timeMs);
  if (time.format('YYYY') === now.format('YYYY')) {
    return time.format('MMM DD HH:mm');
  }
  return time.format('MMM DD YYYY');
}

function getFileData(filePath) {
  return new Promise((resolve, reject) => {
    fs.lstat(filePath, (err, stats) => {
      if (err) {
        reject(err.message);
      } else {
        let filename = path.parse(filePath).base;
        let fileType = getFileType(stats.mode);
        let perms = getPermissions(stats.mode);
        let mTime = getTimeString(stats.mtimeMs);
        resolve({
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
            mtime: stats.mtimeMs / 1000
          }
        });
      }
    });
  });
}

function getDirData(dirPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        reject(err.message);
      } else {
        resolve(files);
      }
    });
  });
}

function readDir(dirPath) {
  return getDirData(dirPath).then(async fileList => {
    let data = [];
    for (let f of fileList) {
      let e = await getFileData(path.join(dirPath, f));
      data.push(e);
    }
    return data;
  });
}

module.exports = {
  getFileData,
  getDirData,
  readDir
};
