'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ssh2 = require('ssh2');
const {readDir} = require('./files');

const OPEN_MODE = ssh2.SFTP_OPEN_MODE;
const STATUS_CODE = ssh2.SFTP_STATUS_CODE;

const allowedUser = 'test';
const allowedPassword = 'secret';

const root = path.join(__dirname, '../data');

let handles = [];

new ssh2.Server(
  {
    hostKeys: [
      fs.readFileSync(path.join(__dirname, '../keys', 'sftp-test_rsa'))
    ]
  },
  function(client) {
    console.log('Client connected!');

    client
      .on('authentication', function(ctx) {
        console.log('Context:');
        console.dir(ctx);
        let user = ctx.username;
        console.log(`Username is ${user}`);
        if (
          user.length !== allowedUser.length ||
          !crypto.timingSafeEqual(Buffer.from(user), Buffer.from(allowedUser))
        ) {
          console.log('Username does not match');
          return ctx.reject();
        }

        let password = ctx.password;
        console.log(`Password is ${password}`);
        console.log(`Method is ${ctx.method}`);
        switch (ctx.method) {
          case 'password':
            if (
              password.length !== allowedPassword.length ||
              !crypto.timingSafeEqual(
                Buffer.from(password),
                Buffer.from(allowedPassword)
              )
            ) {
              console.log('Password does not match');
              return ctx.reject();
            }
            break;
          default:
            return ctx.reject();
        }

        ctx.accept();
      })
      .on('ready', function() {
        console.log('Client authenticated!');

        client.on('session', function(accept, reject) {
          console.log('session requested');
          let session = accept();
          session.on('sftp', function(accept, reject) {
            console.log('Client SFTP session');
            let openFiles = {};
            let handleCount = 0;
            // `sftpStream` is an `SFTPStream` instance in server mode
            // see: https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
            let sftpStream = accept();
            sftpStream
              .on('OPEN', function(reqid, filename, flags, attrs) {
                console.log(`SFTP open event: RQID: ${reqid}`);
                // only allow opening /tmp/foo.txt for writing
                if (filename !== '/tmp/foo.txt' || !(flags & OPEN_MODE.WRITE))
                  return sftpStream.status(reqid, STATUS_CODE.FAILURE);
                // create a fake handle to return to the client, this could easily
                // be a real file descriptor number for example if actually opening
                // the file on the disk
                let handle = new Buffer(4);
                openFiles[handleCount] = true;
                handle.writeUInt32BE(handleCount++, 0, true);
                sftpStream.handle(reqid, handle);
                console.log('Opening file for write');
              })
              .on('READ', function(reqid, handle, offset, length) {
                console.log(`SFTP read event: RQID ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('FSTAT', function(reqid, handle) {
                console.log(`SFTP fstat event: RQID: ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('FSETSTAT', function(reqid, handle, attrs) {
                console.log(`SFTP fsetstat event: RQID: ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('OPENDIR', function(reqid, path) {
                console.log(`SFTP opendir event: RQID: ${reqid}`);
                let dirPath = path || root;
                if (!dirPath.startsWith('/')) {
                  dirPath = path.join(root, dirPath);
                }
                fs.realpath(dirPath, function(err, absPath) {
                  if (err) {
                    sftpStream.status(reqid, STATUS_CODE.NO_SUCH_FILE);
                  } else {
                    sftpStream.handle(reqid, Buffer.from(absPath));
                  }
                });
              })
              .on('READDIR', async function(reqid, handle) {
                console.log(`SFTP readdir event: RQID: ${reqid}`);
                console.log(`handle is ${handle.toString()}`);
                try {
                  let fileData = await readDir(handle.toString());
                  sftpStream.name(reqid, fileData);
                  sftpStream.status(reqid, STATUS_CODE.EOF);
                  return true;
                } catch (err) {
                  console.log(`Error Msg: ${err}`);
                  sftpStream.status(reqid, STATUS_CODE.FAILURE, err.toString());
                  return true;
                }
              })
              .on('LSTAT', function(reqid, path) {
                console.log(`SFTP lstat event: RQID ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('STAT', function(reqid, path) {
                console.log(`SFTP stat event: RQID ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('REMOVE', function(reqid, path) {
                console.log(`SFTP remove event: RQID ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('RMDIR', function(reqid, path) {
                console.log(`SFTP rmdir event: RQID ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('REALPATH', function(reqid, path) {
                console.log(`SFTP realpath event: RQID ${reqid}`);
                console.log(`path is ${path}`);
                console.log(`absPath is ${root}`);
                sftpStream.name(reqid, [root]);
                // sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('READLINK', function(reqid, path) {
                console.log(`SFTP readlink event: RQID ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('SETSTAT', function(reqid, path, attrs) {
                console.log(`SFTP setstat event: RQID: ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('MKDIR', function(reqid, path, attrs) {
                console.log(`SFTP mkdir event: RQID: ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('RENAME', function(reqid, oldName, newName) {
                console.log(`SFTP rename event: RQID ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('SYMLINK', function(reqid, linkPath, targetPath) {
                console.log(`SFTP symlink event: RQID: ${reqid}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('WRITE', function(reqid, handle, offset, data) {
                console.log(`SFTP write event: RQID: ${reqid}`);
                if (
                  handle.length !== 4 ||
                  !openFiles[handle.readUInt32BE(0, true)]
                )
                  return sftpStream.status(reqid, STATUS_CODE.FAILURE);
                // fake the write
                sftpStream.status(reqid, STATUS_CODE.OK);
                let inspected = require('util').inspect(data);
                console.log(
                  'Write to file at offset %d: %s',
                  offset,
                  inspected
                );
              })
              .on('CLOSE', function(reqid, handle) {
                console.log(`SFTP close event: RQID ${reqid}`);
                let fnum;
                if (
                  handle.length !== 4 ||
                  !openFiles[(fnum = handle.readUInt32BE(0, true))]
                )
                  return sftpStream.status(reqid, STATUS_CODE.FAILURE);
                delete openFiles[fnum];
                sftpStream.status(reqid, STATUS_CODE.OK);
                console.log('Closing file');
              });
          });
        });
      })
      .on('end', function() {
        console.log('Client disconnected');
      });
  }
).listen(2222, '127.0.0.1', function() {
  console.log('Listening on port ' + this.address().port);
});
