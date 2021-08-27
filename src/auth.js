const { checkValue } = require("./utils");
const config = require("./config");
const { debugLow, logger } = require("./logger");

const allowedUser = Buffer.from(config.username);
const allowedPassword = Buffer.from(config.password);

function authHandler() {
  return (ctx) => {
    let allowed = true;

    debugLow("authHandler", `Method is ${ctx.method}`);

    switch (ctx.method) {
      case "password": {
        let user = Buffer.from(ctx.username);
        let password = Buffer.from(ctx.password);

        if (!checkValue(user, allowedUser)) {
          debugLow("authHandler", "Username does not match");
          allowed = false;
        }
        if (allowed && !checkValue(password, allowedPassword)) {
          debugLow("authHandler", "Password failed");
          return ctx.reject();
        }
        break;
      }
      default: {
        debugLow("authHandler", `No supporting method for ${ctx.method}`);
        allowed = false;
        return ctx.reject();
      }
    }
    if (allowed) {
      debugLow("authHandler", "Authentication success");
      return ctx.accept();
    }
    logger.info(`authHandler: Authentication failed for ${ctx.username}`);
    return ctx.reject();
  };
}

module.exports = {
  authHandler,
};
