// Dev-only shim: in restricted sandboxes, os.networkInterfaces() can throw
// (uv_interface_addresses), which aborts Next's dev server startup. Make it
// fail safe so the server boots normally.
const os = require("os");
const original = os.networkInterfaces;
os.networkInterfaces = function patchedNetworkInterfaces() {
  try {
    return original.call(os);
  } catch {
    return {};
  }
};
