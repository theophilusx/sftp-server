const listeners = require("../listeners");
const config = require("../config");

test("Normalise relative path . equals root path", () => {
  expect(listeners.normalisePath(".")).toEqual(config.root);
});

test("Normalise relative path .. throws error", () => {
  expect(() => {
    listeners.normalisePath("..");
  }).toThrow(/Bad path/);
});

test("Normalise path returns valid path", () => {
  return expect(listeners.normalisePath(config.root)).toEqual(config.root);
});

test("Normalise deep path returns valid path", () => {
  return expect(listeners.normalisePath("/dir/file.txt")).toEqual(
    `${config.root}/dir/file.txt`
  );
});

test("Normalize relative deep path returns valid path", () => {
  return expect(listeners.normalisePath("/dir/../file.txt")).toEqual(
    `${config.root}/file.txt`
  );
});
