const serverModel = require("../models/server.model");

exports.listServers = async () => {
  return serverModel.listServers();
};

exports.listServerMembers = async (serverId) => {
  return serverModel.listServerMembers(serverId);
};
