const mongoose = require("mongoose");

const WorkspaceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Owner of workspace
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Members invited
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }], // Videos in workspace
}, { timestamps: true });

module.exports =mongoose.model("Workspace", WorkspaceSchema);
