'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ssh2 = require('ssh2');
const listeners = require('listeners');

const STATUS_CODE = ssh2.SFTP_STATUS_CODE;

const allowedUser = 'test';
const allowedPassword = 'secret';

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
              .on('OPEN', listeners.openListener(sftpStream))
              .on('READ', listeners.readListener(sftpStream))
              .on('FSTAT', function(reqid, handle) {
                console.log(`SFTP fstat event: RQID: ${reqid}`);
                console.log(`handle: ${handle.toString()}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('FSETSTAT', function(reqid, handle, attrs) {
                console.log(`SFTP fsetstat event: RQID: ${reqid}`);
                console.log(`handle: ${handle.toString()} attrs: ${attrs}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('OPENDIR', listeners.opendirListener(sftpStream))
              .on('READDIR', listeners.readdirListener(sftpStream))
              .on('LSTAT', listeners.lstatListener(sftpStream))
              .on('STAT', listeners.statListener(sftpStream))
              .on('REMOVE', function(reqid, path) {
                console.log(`SFTP remove event: RQID ${reqid}`);
                console.log(`path: ${path}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('RMDIR', function(reqid, path) {
                console.log(`SFTP rmdir event: RQID ${reqid}`);
                console.log(`path: ${path}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('REALPATH', listeners.realpathListener(sftpStream))
              .on('READLINK', function(reqid, path) {
                console.log(`SFTP readlink event: RQID ${reqid}`);
                console.log(`path: ${path}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('SETSTAT', function(reqid, path, attrs) {
                console.log(`SFTP setstat event: RQID: ${reqid}`);
                console.log(`path: ${path} attrs: ${attrs}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('MKDIR', function(reqid, path, attrs) {
                console.log(`SFTP mkdir event: RQID: ${reqid}`);
                console.log(`path: ${path} attrs: ${attrs}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('RENAME', function(reqid, oldName, newName) {
                console.log(`SFTP rename event: RQID ${reqid}`);
                console.log(`oldName: ${oldName} newName: ${newName}`);
                sftpStream.status(reqid, STATUS_CODE.OP_UNSUPPORTED);
              })
              .on('SYMLINK', function(reqid, linkPath, targetPath) {
                console.log(`SFTP symlink event: RQID: ${reqid}`);
                console.log(`linkath: ${linkPath} target: ${targetPath}`);
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
              .on('CLOSE', listeners.closeListener(sftpStream));
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
