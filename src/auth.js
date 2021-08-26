const { checkValue, debugMsg, config } = require("./utils");
const { DEBUG_LEVEL } = require("./constants");

const allowedUser = Buffer.from(config.username);
const allowedPassword = Buffer.from(config.password);

function authHandler() {
  return (ctx) => {
    let allowed = true;

    debugMsg(DEBUG_LEVEL.LOW, "authHandler", `Method is ${ctx.method}`);

    switch (ctx.method) {
      case "password": {
        let user = Buffer.from(ctx.username);
        let password = Buffer.from(ctx.password);

        if (!checkValue(user, allowedUser)) {
          debugMsg(DEBUG_LEVEL.LOW, "authHandler", "Username does not match");
          allowed = false;
        }
        if (allowed && !checkValue(password, allowedPassword)) {
          debugMsg(DEBUG_LEVEL.LOW, "authHandler", "Password failed");
          return ctx.reject();
        }
        break;
      }
      default: {
        debugMsg(
          DEBUG_LEVEL.LOW,
          "authHandler",
          `No supporting method for ${ctx.method}`
        );
        allowed = false;
        return ctx.reject();
      }
    }
    if (allowed) {
      debugMsg(DEBUG_LEVEL.LOW, "authHandler", "Authentication success");
      return ctx.accept();
    }
    debugMsg(DEBUG_LEVEL.LOW, "authHandler", "Authenticaiton failure");
    return ctx.reject();
  };
}

module.exports = {
  authHandler,
};
