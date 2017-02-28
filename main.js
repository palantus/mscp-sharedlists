const SharedLists = require("./sharedlists.js");
const Client = require("mscp");
const path = require("path");

(async () => {
  let client = new Client(SharedLists)
  client.server.static(path.join(__dirname, 'www'));
  client.start();
})()
