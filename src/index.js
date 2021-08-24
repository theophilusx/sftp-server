"use strict";

const path = require("path");
const fs = require("fs");
const { Server } = require("ssh2");
const listeners = require("./listeners");
const { checkValue } = require("./utils");

//const STATUS_CODE = ssh2.SFTP_STATUS_CODE;

const allowedUser = Buffer.from("test");
const allowedPassword = Buffer.from("secret");

new Server(
  {
    hostKeys: [
      fs.readFileSync(path.join(__dirname, "../keys", "sftp-test_rsa")),
    ],
  },
  (client) => {
    console.log("Client connected!");

    client
      .on("authentication", (ctx) => {
        console.log("Context:");
        console.dir(ctx);
        let user = Buffer.from(ctx.username);
        console.log(`Username is ${ctx.username}`);

        let allowed = true;

        if (!checkValue(user, allowedUser)) {
          console.log("Username does not match");
          allowed = false;
        }

        console.log(`Method is ${ctx.method}`);

        switch (ctx.method) {
          case "password": {
            let password = Buffer.from(ctx.password);
            if (!checkValue(password, allowedPassword)) {
              console.log("Password failed");
              return ctx.reject();
            }
            break;
          }
          default: {
            console.log(`No supporting method for ${ctx.method}`);
            return ctx.reject();
          }
        }
        if (allowed) {
          console.log("Authentication success");
          return ctx.accept();
        }
        console.log("Authenticaiton failure");
        return ctx.reject();
      })
      .on("ready", () => {
        console.log("Client authenticated!");

        client.on("session", (accept) => {
          console.log("session requested");
          let session = accept();
          session.on("sftp", function (accept) {
            console.log("Client SFTP session");
            let sftpStream = accept();
            sftpStream
              //.on('OPEN', listeners.open(sftpStream))
              .on("OPEN", listeners.noop(sftpStream))
              //.on("READ", listeners.read(sftpStream))
              .on("READ", listeners.noop(sftpStream))
              .on("WRITE", listeners.write(sftpStream))
              .on("FSTAT", listeners.noop(sftpStream, "fstat"))
              .on("FSETSTAT", listeners.noop(sftpStream, "fsetstat"))
              .on("CLOSE", listeners.close(sftpStream))
              .on("OPENDIR", listeners.opendir(sftpStream))
              .on("READDIR", listeners.readdir(sftpStream))
              .on("LSTAT", listeners.lstat(sftpStream))
              .on("STAT", listeners.stat(sftpStream))
              .on("REMOVE", listeners.noop(sftpStream, "remove"))
              .on("RMDIR", listeners.noop(sftpStream, "rmdir"))
              .on("REALPATH", listeners.realpath(sftpStream))
              .on("READLINK", listeners.noop(sftpStream, "readlink"))
              .on("SETSTAT", listeners.noop(sftpStream, "setstat"))
              .on("MKDIR", listeners.noop(sftpStream, "mkdir"))
              .on("RENAME", listeners.noop(sftpStream, "rename"))
              .on("SYMLINK", listeners.noop(sftpStream, "symlink"));
          });
        });
      })
      .on("end", () => {
        console.log("Client disconnected");
      });
  }
).listen(2222, "127.0.0.1", function () {
  console.log("Listening on port " + this.address().port);
});
