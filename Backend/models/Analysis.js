const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Owning user reference is required"],
            index: true,
        },
        inputData: {
            fullIdea: {
                type: String,
                required: [true, "Idea description is required"],
                trim: true,
            },
            problem: {
                type: String,
                trim: true,
                default: "",
            },
            audience: {
                type: String,
                trim: true,
                default: "",
            },
            solution: {
                type: String,
                trim: true,
                default: "",
            },
            revenue: {
                type: String,
                trim: true,
                default: "",
            },
            stage: {
                type: String,
                trim: true,
                default: "",
            },
            competition: {
                type: String,
                trim: true,
                default: "",
            },
            demand: {
                type: String,
                trim: true,
                default: "",
            },
            timeCommitment: {
                type: String,
                trim: true,
                default: "",
            },
            budget: {
                type: String,
                trim: true,
                default: "",
            },
            skillLevel: {
                type: String,
                trim: true,
                default: "",
            },
            hasCoFounder: {
                type: Boolean,
                default: false,
            },
        },
        results: {
            score: {
                type: Number,
                min: 0,
                max: 100,
            },
            feasibility: {
                type: String,
                default: "",
            },
            marketDemand: {
                type: String,
                default: "",
            },
            profitPotential: {
                type: String,
                default: "",
            },
            scalability: {
                type: String,
                default: "",
            },
            risks: {
                type: String,
                default: "",
            },
            targetAudience: {
                type: String,
                default: "",
            },
            competitors: {
                type: String,
                default: "",
            },
            strengths: {
                type: String,
                default: "",
            },
            weaknesses: {
                type: String,
                default: "",
            },
            opportunities: {
                type: String,
                default: "",
            },
            threats: {
                type: String,
                default: "",
            },
            roadmap: {
                type: [String],
                default: [],
            },
            verdict: {
                type: String,
                default: "",
            },
            rawResponse: {
                type: String,
                default: "",
            },
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Analysis", analysisSchema);
