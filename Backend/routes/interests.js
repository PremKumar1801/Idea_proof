const express = require("express");
const mongoose = require("mongoose");
const Interest = require("../models/Interest");
const Idea = require("../models/Idea");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

/* ==============================================================================
   CONTROLLER: Express Interest in an Idea
   POST /api/ideas/:id/interest
   ============================================================================== */
const createInterest = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid idea ID",
            });
        }

        const idea = await Idea.findById(id);

        if (!idea || !idea.isActive) {
            return res.status(404).json({
                success: false,
                message: "Idea not found or is no longer active",
            });
        }

        // Do not allow users to express interest in their own ideas
        if (idea.founder.toString() === req.userId) {
            return res.status(400).json({
                success: false,
                message: "You cannot express interest in your own idea",
            });
        }

        let message = "";
        if (req.body.message !== undefined && req.body.message !== null) {
            if (typeof req.body.message !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Message must be a string",
                });
            }
            message = req.body.message.trim();
            if (message.length > 500) {
                return res.status(400).json({
                    success: false,
                    message: "Message cannot exceed 500 characters",
                });
            }
        }

        // Check for existing interest request
        const existingInterest = await Interest.findOne({
            idea: idea._id,
            sender: req.userId,
        });

        if (existingInterest) {
            return res.status(409).json({
                success: false,
                message: "You have already expressed interest in this idea",
            });
        }

        const newInterest = await Interest.create({
            idea: idea._id,
            sender: req.userId,
            message,
            status: "pending",
        });

        return res.status(201).json({
            success: true,
            message: "Interest expressed successfully",
            interest: {
                id: newInterest._id,
                ideaId: newInterest.idea,
                status: newInterest.status,
                message: newInterest.message,
                createdAt: newInterest.createdAt,
            },
        });
    } catch (error) {
        // Handle MongoDB duplicate key error code 11000 gracefully
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "You have already expressed interest in this idea",
            });
        }

        console.error("Create Interest Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while expressing interest",
        });
    }
};

/* ==============================================================================
   ROUTE: Express Interest (mounted under /interests/ideas/:id/interest or /:id/interest)
   ============================================================================== */
router.post("/ideas/:id/interest", authMiddleware, createInterest);
router.post("/:id/interest", authMiddleware, createInterest);

/* ==============================================================================
   ROUTE: Get Interests Received for Current Founder's Ideas
   GET /api/interests/received
   ============================================================================== */
router.get("/received", authMiddleware, async (req, res) => {
    try {
        // Find all ideas owned by the authenticated founder
        const myIdeas = await Idea.find({ founder: req.userId }).select("_id");
        const myIdeaIds = myIdeas.map((idea) => idea._id);

        if (myIdeaIds.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                interests: [],
            });
        }

        // Retrieve interests for those ideas, populating safe public fields only
        const interests = await Interest.find({ idea: { $in: myIdeaIds } })
            .populate("sender", "name _id")
            .populate("idea", "title industry stage isActive _id")
            .sort({ createdAt: -1 });

        // Transform results to ensure no sensitive fields could leak
        const sanitizedInterests = interests.map((item) => ({
            id: item._id,
            idea: item.idea
                ? {
                      id: item.idea._id,
                      title: item.idea.title,
                      industry: item.idea.industry,
                      stage: item.idea.stage,
                      isActive: item.idea.isActive,
                  }
                : null,
            sender: item.sender
                ? {
                      id: item.sender._id,
                      name: item.sender.name,
                  }
                : null,
            message: item.message,
            status: item.status,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        }));

        return res.status(200).json({
            success: true,
            count: sanitizedInterests.length,
            interests: sanitizedInterests,
        });
    } catch (error) {
        console.error("Get Received Interests Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching received interests",
        });
    }
});

/* ==============================================================================
   ROUTE: Update Interest Status (Accept or Decline)
   PATCH /api/interests/:id
   ============================================================================== */
router.patch("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid interest request ID",
            });
        }

        const { status } = req.body;

        if (!status || typeof status !== "string") {
            return res.status(400).json({
                success: false,
                message: "Status is required and must be a string",
            });
        }

        const normalizedStatus = status.trim().toLowerCase();

        if (!["accepted", "declined"].includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: "Status must be either 'accepted' or 'declined'",
            });
        }

        const interest = await Interest.findById(id).populate("idea");

        if (!interest) {
            return res.status(404).json({
                success: false,
                message: "Interest request not found",
            });
        }

        if (!interest.idea) {
            return res.status(404).json({
                success: false,
                message: "Associated idea no longer exists",
            });
        }

        // Only the founder who owns the related idea can accept or decline
        if (interest.idea.founder.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                message: "Only the idea founder can accept or decline collaboration requests",
            });
        }

        interest.status = normalizedStatus;
        await interest.save();

        return res.status(200).json({
            success: true,
            message: `Collaboration request ${normalizedStatus} successfully`,
            interest: {
                id: interest._id,
                status: interest.status,
                updatedAt: interest.updatedAt,
            },
        });
    } catch (error) {
        console.error("Update Interest Status Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating interest request",
        });
    }
});

module.exports = router;
module.exports.createInterest = createInterest;
