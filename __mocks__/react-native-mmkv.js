/** Jest stub — avoids native NitroModules / MMKV in tests. */
const memory = new Map();

function createMMKV() {
  return {
    set: (name, value) => {
      memory.set(name, String(value));
    },
    getString: name => memory.get(name),
    remove: name => {
      memory.delete(name);
    },
  };
}

module.exports = { createMMKV };
