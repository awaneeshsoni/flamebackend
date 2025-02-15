const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Commenter's name
    text: { type: String, required: true }, // Comment text
    timestamp: { type: Number, required: true }, // Time in video when comment was added
    date: { type: Date, default: Date.now }
});

const VideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    isPublic: {type: Boolean , default: false }, // Cloudflare R2 URL
    s3Key: { type: String, required: true },
    r2Key: { type: String }, // Unique key for R2 storage
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true }, // Belongs to workspace
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Who uploaded it
    comments: [CommentSchema], // Timestamp-based comments
}, { timestamps: true });

module.exports = mongoose.model("Video", VideoSchema);
