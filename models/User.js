const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    workspaces: [{ type: mongoose.Schema.Types.ObjectId, ref: "Workspace" }],
});

module.exports = mongoose.model("User", UserSchema);
