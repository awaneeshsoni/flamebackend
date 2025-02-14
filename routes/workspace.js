const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Workspace = require("../models/Workspace");
const User = require("../models/User");

// @route   GET /workspaces
// @desc    Get all workspaces the user is part of
// @access  Private
router.get("/", auth, async (req, res) => {
    try {
        const workspaces = await Workspace.find({ creator: req.user.userId }).populate("members")
            .populate("creator");
        res.json(workspaces);
    } catch (error) {
        console.error("Error fetching workspaces:", error);
        res.status(500).json({ message: "Failed to fetch workspaces form bakcend" });
    }
});
router.get("/:id", auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById({ _id: req.params.id })
            .populate('members', 'name email username profilePicture') // Populate 'members' and select specific fields
            .populate('videos', 'title url') // Populate 'videos' and select specific fields
            .populate('creator', 'name email username ');
        res.json(workspace);
    } catch (error) {
        console.error("Error fetching workspaces:", error);
        res.status(500).json({ message: "Failed to fetch workspaces form bakcend" });
    }
});

// @route   POST /workspaces
// @desc    Create a new workspace
// @access  Private
router.post("/", auth, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Workspace name is required" });

        // Create new workspace
        const newWorkspace = new Workspace({
            name,
            creator: req.user.userId,
            members: [req.user.userId], // Add creator as the first member
        });

        await newWorkspace.save();

        // Add workspace ID to the user's `workspaces` array
        await User.findByIdAndUpdate(req.user.userId, {
            $push: { workspaces: newWorkspace._id }
        });

        res.json(newWorkspace);
    } catch (error) {
        console.error("Error creating workspace:", error);
        res.status(500).json({ message: "Failed to create workspace" });
    }
});


// @route   POST /workspaces/:id/invite
// @desc    Invite a user to the workspace (Pro users only)
// @access  Private (Pro Plan Required)
router.post("/:id/invite", auth, async (req, res) => {
    try {
        const { userId } = req.body;
        const workspace = await Workspace.findById(req.params.id);
        const invitingUser = await User.findById(req.user.userId);

        if (!workspace) return res.status(404).json({ message: "Workspace not found" });

        // Only Pro users can invite
        if (invitingUser.plan !== "pro") {
            return res.status(403).json({ message: "Upgrade to Pro to invite users" });
        }

        if (workspace.users.includes(userId)) {
            return res.status(400).json({ message: "User is already in the workspace" });
        }

        workspace.users.push(userId);
        await workspace.save();

        res.json({ message: "User invited successfully" });
    } catch (error) {
        console.error("Error inviting user:", error);
        res.status(500).json({ message: "Failed to invite user" });
    }
});

module.exports = router;
