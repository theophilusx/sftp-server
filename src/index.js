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
              .on('FSTAT', listeners.noop(sftpStream, 'fstat'))
              .on('FSETSTAT', listeners.noop(sftpStream, 'fsetstat'))
              .on('OPENDIR', listeners.opendir(sftpStream))
              .on('READDIR', listeners.readdir(sftpStream))
              .on('LSTAT', listeners.lstat(sftpStream))
              .on('STAT', listeners.stat(sftpStream))
              .on('REMOVE', listeners.noop(sftpStream, 'remove'))
              .on('RMDIR', listeners.noop(sftpStream, 'rmdir'))
              .on('REALPATH', listeners.realpath(sftpStream))
              .on('READLINK', listeners.noop(sftpStream, 'readlink'))
              .on('SETSTAT', listeners.noop(sftpStream, 'setstat'))
              .on('MKDIR', listeners.noop(sftpStream, 'mkdir'))
              .on('RENAME', listeners.noop(sftpStream, 'rename'))
              .on('SYMLINK', listeners.noop(sftpStream, 'symlink'))
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
