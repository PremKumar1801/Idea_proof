const mongoose = require("mongoose");

const INTEREST_STATUSES = ["pending", "accepted", "declined"];

const interestSchema = new mongoose.Schema(
    {
        idea: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Idea",
            required: [true, "Idea reference is required"],
            index: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Sender reference is required"],
            index: true,
        },
        message: {
            type: String,
            trim: true,
            maxlength: [500, "Message cannot exceed 500 characters"],
            default: "",
        },
        status: {
            type: String,
            enum: {
                values: INTEREST_STATUSES,
                message: "{VALUE} is not a valid interest status",
            },
            default: "pending",
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate interest requests from the same user for the same idea
interestSchema.index({ idea: 1, sender: 1 }, { unique: true });

const Interest = mongoose.model("Interest", interestSchema);

module.exports = Interest;
module.exports.INTEREST_STATUSES = INTEREST_STATUSES;
