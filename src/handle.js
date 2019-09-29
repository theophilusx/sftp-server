'use strict';

const handleState = {
  NEW: 1,
  OPEN: 2,
  CLOSE: 3,
  COMPLETE: 4
};

const handleType = {
  FILE: 1,
  DIR: 2,
  UNKNOWN: 3
};

function handleFactory() {
  let handleId = 0;
  return function(type, path) {
    return {
      id: handleId++,
      state: handleState.NEW,
      type: type,
      path: path
    };
  };
}

module.exports = {
  handleState,
  handleType,
  handleFactory
};
