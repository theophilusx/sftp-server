const config = require("../config");

test("config object has required properties", () => {
  expect(config).toHaveProperty("keyFile");
  expect(config).toHaveProperty("root");
  expect(config).toHaveProperty("username");
  expect(config).toHaveProperty("password");
  expect(config).toHaveProperty("bindAddress");
  expect(config).toHaveProperty("port");
  expect(config).toHaveProperty("debug");
  expect(config).toHaveProperty("logFile");
});
