const utils = require("../utils");

test("config object has required properties", () => {
  expect(utils.config).toHaveProperty("keyFile");
  expect(utils.config).toHaveProperty("root");
  expect(utils.config).toHaveProperty("username");
  expect(utils.config).toHaveProperty("password");
  expect(utils.config).toHaveProperty("bindAddress");
  expect(utils.config).toHaveProperty("port");
  expect(utils.config).toHaveProperty("debug");
});

test("checkValue", () => {
  expect(utils.checkValue(Buffer.from("same"), Buffer.from("same"))).toBe(true);
  expect(utils.checkValue(Buffer.from("same"), Buffer.from("SAME"))).toBe(false);
  expect(utils.checkValue(Buffer.from("same"), Buffer.from("different"))).toBe(false);
});
