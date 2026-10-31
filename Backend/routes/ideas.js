const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Idea = require("../models/Idea");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const { createInterest } = require("./interests");

const {
    INDUSTRIES,
    STAGES,
    COLLABORATOR_ROLES,
    COLLABORATION_STYLES,
} = Idea;

const router = express.Router();

/**
 * Escapes regex special characters to prevent regex injection and ReDoS vulnerabilities.
 */
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Sanitize an idea document for public response, strictly omitting any sensitive fields.
 */
function formatIdeaResponse(ideaDoc) {
    const obj = ideaDoc.toObject ? ideaDoc.toObject() : ideaDoc;

    let founderInfo = null;
    if (obj.founder && typeof obj.founder === "object") {
        founderInfo = {
            id: obj.founder._id || obj.founder.id,
            name: obj.founder.name || obj.founderName,
        };
    } else if (obj.founder) {
        founderInfo = {
            id: obj.founder,
            name: obj.founderName,
        };
    }

    return {
        id: obj._id,
        title: obj.title,
        description: obj.description,
        industry: obj.industry,
        stage: obj.stage,
        founderName: obj.founderName,
        founderSkills: obj.founderSkills || [],
        founderInterests: obj.founderInterests || "",
        teamSize: obj.teamSize,
        hasTeammates: obj.hasTeammates,
        lookingFor: obj.lookingFor || [],
        idealCollaborator: obj.idealCollaborator || "",
        collaborationStyle: obj.collaborationStyle || "Flexible/Open to Discussion",
        isActive: obj.isActive,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        founder: founderInfo,
    };
}

/* ==============================================================================
   ROUTE 1: Publish a New Idea
   POST /api/ideas
   Requires: JWT Authentication
   ============================================================================== */
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            title,
            description,
            industry,
            stage,
            founderName,
            founderSkills,
            founderInterests,
            teamSize,
            hasTeammates,
            lookingFor,
            idealCollaborator,
            collaborationStyle,
        } = req.body;

        // 1. Validate Title
        if (!title || typeof title !== "string" || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Idea title is required",
            });
        }
        const trimmedTitle = title.trim();
        if (trimmedTitle.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Idea title cannot exceed 100 characters",
            });
        }

        // 2. Validate Description
        if (!description || typeof description !== "string" || description.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Idea description is required",
            });
        }
        const trimmedDescription = description.trim();
        if (trimmedDescription.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Idea description cannot exceed 2000 characters",
            });
        }

        // 3. Validate Industry
        if (!industry || typeof industry !== "string" || !INDUSTRIES.includes(industry.trim())) {
            return res.status(400).json({
                success: false,
                message: `Industry is required and must be one of: ${INDUSTRIES.join(", ")}`,
            });
        }

        // 4. Validate Stage
        if (!stage || typeof stage !== "string" || !STAGES.includes(stage.trim())) {
            return res.status(400).json({
                success: false,
                message: `Stage is required and must be one of: ${STAGES.join(", ")}`,
            });
        }

        // 5. Validate or Resolve Founder Display Name
        let resolvedFounderName = "";
        if (founderName && typeof founderName === "string" && founderName.trim().length > 0) {
            resolvedFounderName = founderName.trim();
            if (resolvedFounderName.length > 60) {
                return res.status(400).json({
                    success: false,
                    message: "Founder display name cannot exceed 60 characters",
                });
            }
        } else {
            // Fall back to registered user's name
            const user = await User.findById(req.userId).select("name");
            if (user && user.name) {
                resolvedFounderName = user.name;
            } else {
                resolvedFounderName = "Founder";
            }
        }

        // 6. Validate Founder Skills
        let validatedSkills = [];
        if (founderSkills !== undefined && founderSkills !== null) {
            if (!Array.isArray(founderSkills)) {
                return res.status(400).json({
                    success: false,
                    message: "Founder skills must be an array of strings",
                });
            }
            if (founderSkills.length > 20) {
                return res.status(400).json({
                    success: false,
                    message: "Founder skills cannot exceed 20 items",
                });
            }
            for (const skill of founderSkills) {
                if (typeof skill !== "string") {
                    return res.status(400).json({
                        success: false,
                        message: "Each skill in founder skills must be a string",
                    });
                }
                const trimmedSkill = skill.trim();
                if (trimmedSkill.length > 50) {
                    return res.status(400).json({
                        success: false,
                        message: "Individual skill tags cannot exceed 50 characters",
                    });
                }
                if (trimmedSkill.length > 0 && !validatedSkills.includes(trimmedSkill)) {
                    validatedSkills.push(trimmedSkill);
                }
            }
        }

        // 7. Validate Founder Interests
        let validatedInterests = "";
        if (founderInterests !== undefined && founderInterests !== null) {
            if (typeof founderInterests !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Founder interests must be a string",
                });
            }
            validatedInterests = founderInterests.trim();
            if (validatedInterests.length > 150) {
                return res.status(400).json({
                    success: false,
                    message: "Founder interests cannot exceed 150 characters",
                });
            }
        }

        // 8. Validate Team Size and Teammates Flag
        let parsedTeamSize = 1;
        if (teamSize !== undefined && teamSize !== null) {
            parsedTeamSize = parseInt(teamSize, 10);
            if (isNaN(parsedTeamSize) || parsedTeamSize < 1 || parsedTeamSize > 10) {
                return res.status(400).json({
                    success: false,
                    message: "Team size must be an integer between 1 and 10",
                });
            }
        }

        let parsedHasTeammates = false;
        if (hasTeammates !== undefined && hasTeammates !== null) {
            parsedHasTeammates = Boolean(hasTeammates);
        } else {
            parsedHasTeammates = parsedTeamSize > 1;
        }

        // 9. Validate Collaborator Roles Looking For
        let validatedLookingFor = [];
        if (lookingFor !== undefined && lookingFor !== null) {
            if (!Array.isArray(lookingFor)) {
                return res.status(400).json({
                    success: false,
                    message: "Looking for must be an array of roles",
                });
            }
            if (lookingFor.length > 15) {
                return res.status(400).json({
                    success: false,
                    message: "Looking for cannot exceed 15 roles",
                });
            }
            for (const role of lookingFor) {
                if (typeof role !== "string" || !COLLABORATOR_ROLES.includes(role.trim())) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid role '${role}'. Supported roles are: ${COLLABORATOR_ROLES.join(", ")}`,
                    });
                }
                const trimmedRole = role.trim();
                if (!validatedLookingFor.includes(trimmedRole)) {
                    validatedLookingFor.push(trimmedRole);
                }
            }
        }

        // 10. Validate Ideal Collaborator Description
        let validatedIdeal = "";
        if (idealCollaborator !== undefined && idealCollaborator !== null) {
            if (typeof idealCollaborator !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Ideal collaborator description must be a string",
                });
            }
            validatedIdeal = idealCollaborator.trim();
            if (validatedIdeal.length > 400) {
                return res.status(400).json({
                    success: false,
                    message: "Ideal collaborator description cannot exceed 400 characters",
                });
            }
        }

        // 11. Validate Collaboration Style
        let validatedStyle = "Flexible/Open to Discussion";
        if (collaborationStyle !== undefined && collaborationStyle !== null && collaborationStyle !== "") {
            if (typeof collaborationStyle !== "string" || !COLLABORATION_STYLES.includes(collaborationStyle.trim())) {
                return res.status(400).json({
                    success: false,
                    message: `Collaboration style must be one of: ${COLLABORATION_STYLES.join(", ")}`,
                });
            }
            validatedStyle = collaborationStyle.trim();
        }

        // Create the idea document with authenticated user as founder
        const newIdea = await Idea.create({
            founder: req.userId,
            title: trimmedTitle,
            description: trimmedDescription,
            industry: industry.trim(),
            stage: stage.trim(),
            founderName: resolvedFounderName,
            founderSkills: validatedSkills,
            founderInterests: validatedInterests,
            teamSize: parsedTeamSize,
            hasTeammates: parsedHasTeammates,
            lookingFor: validatedLookingFor,
            idealCollaborator: validatedIdeal,
            collaborationStyle: validatedStyle,
            isActive: true,
        });

        return res.status(201).json({
            success: true,
            message: "Idea published successfully",
            idea: formatIdeaResponse(newIdea),
        });
    } catch (error) {
        console.error("Publish Idea Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while publishing idea",
        });
    }
});

/* ==============================================================================
   ROUTE 2: Get Current User's Ideas
   GET /api/ideas/my
   Requires: JWT Authentication
   NOTE: Defined before /:id so Express does not parse 'my' as an ObjectId!
   ============================================================================== */
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const myIdeas = await Idea.find({ founder: req.userId })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: myIdeas.length,
            ideas: myIdeas.map(formatIdeaResponse),
        });
    } catch (error) {
        console.error("Get My Ideas Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching your ideas",
        });
    }
});

/* ==============================================================================
   ROUTE 3: Browse & Search Published Ideas
   GET /api/ideas
   Public Endpoint
   ============================================================================== */
router.get("/", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            industry,
            stage,
            skills,
            lookingFor,
            search,
            sort = "newest",
        } = req.query;

        // Parse and clamp pagination
        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
        const skip = (parsedPage - 1) * parsedLimit;

        // Build query filter — always active ideas only
        const filter = { isActive: true };

        if (industry && typeof industry === "string" && industry.trim().length > 0) {
            filter.industry = industry.trim();
        }

        if (stage && typeof stage === "string" && stage.trim().length > 0) {
            filter.stage = stage.trim();
        }

        if (lookingFor && typeof lookingFor === "string" && lookingFor.trim().length > 0) {
            // Handle single role or comma-separated roles
            const roles = lookingFor.split(",").map((r) => r.trim()).filter(Boolean);
            if (roles.length > 0) {
                filter.lookingFor = { $in: roles };
            }
        }

        if (skills && typeof skills === "string" && skills.trim().length > 0) {
            const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean);
            if (skillList.length > 0) {
                // Match skill tags case-insensitively using escaped regexes
                filter.founderSkills = {
                    $in: skillList.map((s) => new RegExp(`^${escapeRegex(s)}$`, "i")),
                };
            }
        }

        if (search && typeof search === "string" && search.trim().length > 0) {
            const safeSearch = escapeRegex(search.trim());
            const searchRegex = new RegExp(safeSearch, "i");
            filter.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { founderSkills: searchRegex },
            ];
        }

        // Determine sort order
        let sortOption = { createdAt: -1 };
        if (sort === "oldest") {
            sortOption = { createdAt: 1 };
        }

        const [total, ideas] = await Promise.all([
            Idea.countDocuments(filter),
            Idea.find(filter)
                .populate("founder", "name _id")
                .sort(sortOption)
                .skip(skip)
                .limit(parsedLimit),
        ]);

        const totalPages = Math.ceil(total / parsedLimit) || 1;

        return res.status(200).json({
            success: true,
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages,
            ideas: ideas.map(formatIdeaResponse),
        });
    } catch (error) {
        console.error("Browse Ideas Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while browsing ideas",
        });
    }
});

/* ==============================================================================
   ROUTE 4: Get Single Idea by ID
   GET /api/ideas/:id
   Public Endpoint
   ============================================================================== */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid idea ID",
            });
        }

        const idea = await Idea.findById(id).populate("founder", "name _id");

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: "Idea not found",
            });
        }

        // If deactivated, only the authenticated founder can view it
        if (!idea.isActive) {
            let isOwner = false;
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                try {
                    const token = authHeader.split(" ")[1];
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    if (decoded && decoded.userId && idea.founder) {
                        const founderId = idea.founder._id ? idea.founder._id.toString() : idea.founder.toString();
                        if (founderId === decoded.userId) {
                            isOwner = true;
                        }
                    }
                } catch (e) {
                    // Invalid token
                }
            }
            if (!isOwner) {
                return res.status(404).json({
                    success: false,
                    message: "Idea not found or is no longer active",
                });
            }
        }

        return res.status(200).json({
            success: true,
            idea: formatIdeaResponse(idea),
        });
    } catch (error) {
        console.error("Get Single Idea Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching idea details",
        });
    }
});

/* ==============================================================================
   ROUTE 5: Update Own Idea
   PUT /api/ideas/:id
   Requires: JWT Authentication (Owner Only)
   ============================================================================== */
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid idea ID",
            });
        }

        const idea = await Idea.findById(id);

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: "Idea not found",
            });
        }

        // Verify that only the idea founder can update
        if (idea.founder.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You can only edit your own ideas",
            });
        }

        const updates = req.body;

        // Apply strict field validation on updates
        if (updates.title !== undefined) {
            if (typeof updates.title !== "string" || updates.title.trim().length === 0) {
                return res.status(400).json({ success: false, message: "Title cannot be empty" });
            }
            if (updates.title.trim().length > 100) {
                return res.status(400).json({ success: false, message: "Title cannot exceed 100 characters" });
            }
            idea.title = updates.title.trim();
        }

        if (updates.description !== undefined) {
            if (typeof updates.description !== "string" || updates.description.trim().length === 0) {
                return res.status(400).json({ success: false, message: "Description cannot be empty" });
            }
            if (updates.description.trim().length > 2000) {
                return res.status(400).json({ success: false, message: "Description cannot exceed 2000 characters" });
            }
            idea.description = updates.description.trim();
        }

        if (updates.industry !== undefined) {
            if (typeof updates.industry !== "string" || !INDUSTRIES.includes(updates.industry.trim())) {
                return res.status(400).json({ success: false, message: `Industry must be one of: ${INDUSTRIES.join(", ")}` });
            }
            idea.industry = updates.industry.trim();
        }

        if (updates.stage !== undefined) {
            if (typeof updates.stage !== "string" || !STAGES.includes(updates.stage.trim())) {
                return res.status(400).json({ success: false, message: `Stage must be one of: ${STAGES.join(", ")}` });
            }
            idea.stage = updates.stage.trim();
        }

        if (updates.founderName !== undefined) {
            if (typeof updates.founderName !== "string" || updates.founderName.trim().length === 0) {
                return res.status(400).json({ success: false, message: "Founder name cannot be empty" });
            }
            if (updates.founderName.trim().length > 60) {
                return res.status(400).json({ success: false, message: "Founder name cannot exceed 60 characters" });
            }
            idea.founderName = updates.founderName.trim();
        }

        if (updates.founderSkills !== undefined) {
            if (!Array.isArray(updates.founderSkills)) {
                return res.status(400).json({ success: false, message: "Founder skills must be an array" });
            }
            const cleanSkills = [];
            for (const s of updates.founderSkills) {
                if (typeof s === "string" && s.trim().length > 0 && s.trim().length <= 50) {
                    if (!cleanSkills.includes(s.trim())) cleanSkills.push(s.trim());
                }
            }
            idea.founderSkills = cleanSkills;
        }

        if (updates.founderInterests !== undefined) {
            if (typeof updates.founderInterests !== "string") {
                return res.status(400).json({ success: false, message: "Founder interests must be a string" });
            }
            if (updates.founderInterests.trim().length > 150) {
                return res.status(400).json({ success: false, message: "Founder interests cannot exceed 150 characters" });
            }
            idea.founderInterests = updates.founderInterests.trim();
        }

        if (updates.teamSize !== undefined) {
            const size = parseInt(updates.teamSize, 10);
            if (isNaN(size) || size < 1 || size > 10) {
                return res.status(400).json({ success: false, message: "Team size must be between 1 and 10" });
            }
            idea.teamSize = size;
        }

        if (updates.hasTeammates !== undefined) {
            idea.hasTeammates = Boolean(updates.hasTeammates);
        }

        if (updates.lookingFor !== undefined) {
            if (!Array.isArray(updates.lookingFor)) {
                return res.status(400).json({ success: false, message: "Looking for must be an array" });
            }
            const cleanRoles = [];
            for (const role of updates.lookingFor) {
                if (typeof role === "string" && COLLABORATOR_ROLES.includes(role.trim())) {
                    if (!cleanRoles.includes(role.trim())) cleanRoles.push(role.trim());
                } else {
                    return res.status(400).json({ success: false, message: `Invalid role: ${role}` });
                }
            }
            idea.lookingFor = cleanRoles;
        }

        if (updates.idealCollaborator !== undefined) {
            if (typeof updates.idealCollaborator !== "string") {
                return res.status(400).json({ success: false, message: "Ideal collaborator must be a string" });
            }
            if (updates.idealCollaborator.trim().length > 400) {
                return res.status(400).json({ success: false, message: "Ideal collaborator cannot exceed 400 characters" });
            }
            idea.idealCollaborator = updates.idealCollaborator.trim();
        }

        if (updates.collaborationStyle !== undefined) {
            if (updates.collaborationStyle !== "" && !COLLABORATION_STYLES.includes(updates.collaborationStyle.trim())) {
                return res.status(400).json({ success: false, message: `Invalid collaboration style: ${updates.collaborationStyle}` });
            }
            idea.collaborationStyle = updates.collaborationStyle.trim();
        }

        // Prevent modification of protected fields: founder, createdAt, etc.
        await idea.save();

        return res.status(200).json({
            success: true,
            message: "Idea updated successfully",
            idea: formatIdeaResponse(idea),
        });
    } catch (error) {
        console.error("Update Idea Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating idea",
        });
    }
});

/* ==============================================================================
   ROUTE 6: Soft Deactivate Own Idea
   DELETE /api/ideas/:id
   Requires: JWT Authentication (Owner Only)
   ============================================================================== */
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid idea ID",
            });
        }

        const idea = await Idea.findById(id);

        if (!idea) {
            return res.status(404).json({
                success: false,
                message: "Idea not found",
            });
        }

        // Verify that only the idea founder can delete/deactivate
        if (idea.founder.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You can only deactivate your own ideas",
            });
        }

        // Perform soft deactivation
        idea.isActive = false;
        await idea.save();

        return res.status(200).json({
            success: true,
            message: "Idea deactivated successfully",
        });
    } catch (error) {
        console.error("Deactivate Idea Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while deactivating idea",
        });
    }
});

/* ==============================================================================
   ROUTE 7: Express Interest in an Idea
   POST /api/ideas/:id/interest
   Requires: JWT Authentication
   ============================================================================== */
router.post("/:id/interest", authMiddleware, createInterest);

module.exports = router;
