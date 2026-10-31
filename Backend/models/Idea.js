const mongoose = require("mongoose");

const INDUSTRIES = [
    "AI/ML",
    "FinTech",
    "EdTech",
    "HealthTech",
    "B2B SaaS",
    "E-Commerce",
    "CleanTech",
    "Other",
];

const STAGES = [
    "Idea",
    "Building MVP",
    "Live/Early Users",
    "Scaling",
];

const COLLABORATOR_ROLES = [
    "Frontend Developer",
    "Backend Engineer",
    "AI/ML Engineer",
    "UI/UX Designer",
    "Growth/Marketing",
    "Business/Co-Founder",
    "Domain Advisor",
    "Other",
];

const COLLABORATION_STYLES = [
    "Equity-Based Co-Founder",
    "Project Partner",
    "Flexible/Open to Discussion",
];

const ideaSchema = new mongoose.Schema(
    {
        founder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Founder reference is required"],
            index: true,
        },
        title: {
            type: String,
            required: [true, "Idea title is required"],
            trim: true,
            maxlength: [100, "Title cannot exceed 100 characters"],
        },
        description: {
            type: String,
            required: [true, "Idea description is required"],
            trim: true,
            maxlength: [2000, "Description cannot exceed 2000 characters"],
        },
        industry: {
            type: String,
            required: [true, "Industry is required"],
            enum: {
                values: INDUSTRIES,
                message: "{VALUE} is not a supported industry",
            },
        },
        stage: {
            type: String,
            required: [true, "Stage is required"],
            enum: {
                values: STAGES,
                message: "{VALUE} is not a valid stage",
            },
        },
        founderName: {
            type: String,
            required: [true, "Founder display name is required"],
            trim: true,
            maxlength: [60, "Founder name cannot exceed 60 characters"],
        },
        founderSkills: {
            type: [{
                type: String,
                trim: true,
                maxlength: [50, "Skill tag cannot exceed 50 characters"],
            }],
            default: [],
        },
        founderInterests: {
            type: String,
            trim: true,
            maxlength: [150, "Founder interests cannot exceed 150 characters"],
            default: "",
        },
        teamSize: {
            type: Number,
            required: [true, "Team size is required"],
            min: [1, "Team size must be at least 1"],
            max: [10, "Team size cannot exceed 10"],
            default: 1,
        },
        hasTeammates: {
            type: Boolean,
            default: false,
        },
        lookingFor: {
            type: [{
                type: String,
                enum: {
                    values: COLLABORATOR_ROLES,
                    message: "{VALUE} is not a valid collaborator role",
                },
            }],
            default: [],
        },
        idealCollaborator: {
            type: String,
            trim: true,
            maxlength: [400, "Ideal collaborator description cannot exceed 400 characters"],
            default: "",
        },
        collaborationStyle: {
            type: String,
            enum: {
                values: [...COLLABORATION_STYLES, ""],
                message: "{VALUE} is not a valid collaboration style",
            },
            default: "Flexible/Open to Discussion",
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Helpful compound indexes for discovery and sorting
ideaSchema.index({ isActive: 1, createdAt: -1 });
ideaSchema.index({ isActive: 1, industry: 1, createdAt: -1 });
ideaSchema.index({ isActive: 1, stage: 1, createdAt: -1 });
ideaSchema.index({ title: "text", description: "text" });

const Idea = mongoose.model("Idea", ideaSchema);

module.exports = Idea;
module.exports.INDUSTRIES = INDUSTRIES;
module.exports.STAGES = STAGES;
module.exports.COLLABORATOR_ROLES = COLLABORATOR_ROLES;
module.exports.COLLABORATION_STYLES = COLLABORATION_STYLES;
