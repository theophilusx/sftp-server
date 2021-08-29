const utils = require("../utils");

test("checkValue", () => {
  expect(utils.checkValue(Buffer.from("same"), Buffer.from("same"))).toBe(true);
  expect(utils.checkValue(Buffer.from("same"), Buffer.from("SAME"))).toBe(false);
  expect(utils.checkValue(Buffer.from("same"), Buffer.from("different"))).toBe(false);
});
