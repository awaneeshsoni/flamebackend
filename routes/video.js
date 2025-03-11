const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Video = require('../models/Video');
const User = require('../models/User');
const Workspace = require('../models/Workspace');  // Import Workspace model
const dotenv = require("dotenv");
const multer = require('multer');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { uploadToAWS, deleteFromAWS } = require('../utils/awsconfig');
const { uploadToR2, deleteFromR2 } = require('../utils/cloudflareR2');
const mongoose = require('mongoose');
const { uploadFileToAzure, generateSasUrl, deleteFileFromAzure } = require('../utils/azureconfig');

const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('video');

dotenv.config();

// Cloudflare R2 Setup
const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
    },
});

// Multer Setup for File Uploads
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// @route   GET /videos?workspaceId=xxx
// @desc    Fetch all videos for a specific workspace
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { workspaceId } = req.query;
        if (!workspaceId) return res.status(400).json({ message: 'Workspace ID is required' });
        // Check if user has access to this workspace
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
        if (!workspace.members.includes(req.user.userId) && workspace.creator.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied for this workspace. You are neither a member nor the creator' });
        }
        const videos = await Video.find({ workspace: workspaceId });
        res.json({ videos });
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ message: 'Failed to fetch videos' });
    }
});

// @route   GET /videos/:id
// @desc    Fetch a single video by ID
// @access  Private (Must belong to workspace)
router.get('/:id', auth, async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ message: 'Video not found' });

        // Check if user has access to this workspace
        const workspace = await Workspace.findById(video.workspace);
        if (!workspace) {
            return res.status(403).json({ message: 'error fetching workspace' });
        }
        if (!workspace.members.includes(req.user.userId) && workspace.creator.toString() !== req.user.userId) {
            return res.status(403).json({ message: "Access denied. Only workspace members and the creator can upload videos." });
        }

        res.json(video);
    } catch (err) {
        console.error('Error fetching video:', err);
        res.status(500).json({ message: 'Server error' });
    }
});
// router.get('/share/:id', async (req, res) => {
//     try {
//         const video = await Video.findById(req.params.id);
//         if (!video) return res.status(404).json({ message: 'Video not found' });
//         res.json(video);
//     } catch (err) {
//         console.error('Error fetching video:', err);
//         res.status(500).json({ message: 'Server error' });
//         res.alert(err)
//     }
// });
router.get("/share/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // Check if the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid video ID" });
        }
        const video = await Video.findById(id);
        if (!video) {
            console.log("share / error");
            return res.status(404).json({ message: "Video not found" });
        }
        // If video is private, return a custom response
        if (!video.isPublic) {
            return res.status(403).json({
                message: "Video is private",
                statusCode: 403, // Custom code so frontend knows it's private
            });
        }
        // If video is public, return the video details
        return res.json(video);

    } catch (err) {
        console.error("Error fetching video:", err);
        return res.status(500).json({ message: "Server error" });
    }
});
// @route   POST /videos/:id/comments
// @desc    Add a comment to a video
// @access  Private (Must belong to workspace)
router.put('/:id/privacy', auth, async (req, res) => {
    try {
        const { isPublic } = req.body; // Extract isPublic from request body

        // Validate that isPublic is a boolean
        if (typeof isPublic !== "boolean") {
            return res.status(400).json({ message: "Invalid value for isPublic" });
        }

        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Update privacy setting
        video.isPublic = isPublic;
        await video.save();

        // Prepare the response
        const response = {
            message: "Privacy updated successfully",
            isPublic: video.isPublic
        };

        // Only include videoUrl if the video is now public
        if (isPublic) {
            response.id = video._id;
        }

        return res.status(200).json(response);

    } catch (error) {
        console.error('Error updating privacy:', error);
        return res.status(500).json({ message: 'Failed to update privacy' });
    }
});
// @route   POST /videos/:id/comments
// @desc    Add a comment to a video
// @access  Private (Must belong to workspace)
router.post('/:id/comments', async (req, res) => {
    try {
        const { name, text, timestamp } = req.body;

        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ message: 'Video not found' });

        video.comments.push({ name, text, timestamp });
        await video.save();

        res.json(video.comments);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Failed to add comment' });
    }
});

// @route   POST /videos/upload
// @desc    Upload a video to Cloudflare R2 in a specific workspace
// @access  Private
router.post("/upload", auth, uploadStrategy, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(400).json({ message: "User not found." });

        const { workspaceId } = req.body;
        if (!workspaceId) return res.status(400).json({ message: "Workspace ID is required." });

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return res.status(404).json({ message: "Workspace not found" });

        if (!workspace.members.includes(req.user.userId) && workspace.creator.toString() !== req.user.userId) {
            return res.status(403).json({ message: "Access denied. Only workspace members and the creator can upload videos." });
        }

        // const video = req.file;
        // if (!video) return res.status(400).json({ message: "No video file uploaded." });

        // const fileKey = `${workspaceId}/${Date.now()}-${video.originalname}`;

        // let fileUrl;
        // fileUrl = await uploadToAWS(fileKey, video.buffer, video.mimetype);
        // const newVideo = new Video({
        //     title: video.originalname,
        //     workspace: workspaceId,
        //     uploader: user._id,
        //     url: fileUrl,
        //     s3Key: fileKey, // Save fileKey for deletion later
        // });
        // await newVideo.save();

        if (!req.file) {
            return res.status(400).send('No video file uploaded.');
        }

        const blobUrl = await uploadFileToAzure(req.file.buffer, req.file.originalname, req.file.mimetype);
        const video = new Video({
            title: req.file.originalname,
            url: blobUrl,
            workspace: workspaceId,
            uploader: user._id, // Use the user._id from the fetched user
        });
        await video.save();
        
        // workspace.videos.push(video._id);
        // await workspace.save();
        // 

        res.json({ message: "Video uploaded successfully", video });
    } catch (error) {
        console.error("Error uploading video:", error);
        res.status(500).json({ message: "Failed to upload video.", error: error.message });
    }
});

router.delete("/delete/:videoId", auth, async (req, res) => {
    try {
        const video = await Video.findById(req.params.videoId).populate('workspace');
        if (!video) {
            return res.status(404).json({ message: "Video not found." });
        }
    
        const workspace = video.workspace;
        // Ensure the user making the request is the uploader of the video OR a member of the workspace.
        const isCreator = workspace.creator.equals(req.user._id);
        const isMember = workspace.members.includes(req.user._id);
    
          // Either the creator of the workspace OR a member can delete the video
        if (!isCreator && !isMember) {
          return res.status(403).json({ message: 'Unauthorized to delete this video.' });
        }
    
        // Delete the video from Azure Blob Storage
        await deleteFileFromAzure(video.url);
    
       // Remove the video from the workspace's videos array
        // await Workspace.findByIdAndUpdate(
        //     video.workspace,
        //   { $pull: { videos: video._id } }, // Use $pull
        // );
    
         // Remove video from DB
        await Video.findByIdAndDelete(req.params.videoId);
    
    
        res.status(200).json({ message: 'Video deleted successfully.' });
        } catch (error) {
            console.error('Error deleting video:', error);
            res.status(500).json({ message: 'Error deleting video.' });
        }
});

// router.delete("/delete/:videoId", auth, async (req, res) => {
//     try {
//         const video = await Video.findById(req.params.videoId);
//         if (!video) return res.status(404).json({ message: "Video not found" });

//         const workspace = await Workspace.findById(video.workspace);
//         if (!workspace) return res.status(404).json({ message: "Workspace not found" });

//         if (workspace.creator.toString() !== req.user.userId) {
//             return res.status(403).json({ message: "Only the workspace owner can delete videos." });
//         }

//         // Delete from storage
//         await deleteFromAWS(video.s3Key);
//         // Delete from database
//         await Video.findByIdAndDelete(video._id);

//         res.json({ message: "Video deleted successfully" });
//     } catch (error) {
//         console.error("Error deleting video:", error);
//         res.status(500).json({ message: "Failed to delete video.", error: error.message });
//     }
// });

module.exports = router;
