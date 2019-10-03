'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ssh2 = require('ssh2');
const listeners = require('./listeners');

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

        // @ts-ignore
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
            let sftpStream = accept();
            sftpStream
              .on('OPEN', listeners.open(sftpStream))
              .on('READ', listeners.read(sftpStream))
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
              .on('OPENDIR', listeners.opendir(sftpStream))
              .on('READDIR', listeners.readdir(sftpStream))
              .on('LSTAT', listeners.lstat(sftpStream))
              .on('STAT', listeners.stat(sftpStream))
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
              .on('REALPATH', listeners.realpath(sftpStream))
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
              .on('WRITE', listeners.write(sftpStream))
              .on('CLOSE', listeners.close(sftpStream));
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
