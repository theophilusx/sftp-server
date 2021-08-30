const { checkValue } = require("./utils");
const config = require("./config");
const log = require("./logger");

const allowedUser = Buffer.from(config.username);
const allowedPassword = Buffer.from(config.password);

function authenticateClient() {
  return (ctx) => {
    let allowed = true;

    log.debug("authenticateClient", `Method is ${ctx.method}`);

    switch (ctx.method) {
      case "password": {
        let user = Buffer.from(ctx.username);
        let password = Buffer.from(ctx.password);

        if (!checkValue(user, allowedUser)) {
          log.debug("authenticateClient", "Username does not match");
          allowed = false;
        }
        if (allowed && !checkValue(password, allowedPassword)) {
          log.debug("authenticateClient", "Password failed");
          return ctx.reject();
        }
        break;
      }
      default: {
        log.debug("authenticateClient", `No supporting method for ${ctx.method}`);
        allowed = false;
        return ctx.reject();
      }
    }
    if (allowed) {
      log.info("authenticateClient", `User ${ctx.username} ${ctx.method} authenticated`);
      return ctx.accept();
    }
    log.info("authenticateClient", `Authentication failed for ${ctx.username}`);
    return ctx.reject();
  };
}

module.exports = {
  authenticateClient,
};
