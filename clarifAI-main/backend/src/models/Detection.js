const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        filename: {
            type: String,
            required: true,
        },
        originalName: {
            type: String,
            required: true,
        },
        fileSizeBytes: Number,
        mimeType: String,
        score: {
            type: Number,
            required: true,
        },
        label: {
            type: String,
            enum: ["REAL", "FAKE"],
            required: true,
        },
        confidence: {
            type: Number,
            required: true,
        },
        riskLevel: {
            type: String,
            enum: ["Real", "Uncertain", "Likely Fake"],
            required: true,
        },
        faceDetected: {
            type: Boolean,
            default: false,
        },
        heatmapFile: {
            type: String,
        },
        processingTimeMs: Number,
        status: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
        },
        errorMessage: String,
    },
    { timestamps: true }
);

detectionSchema.virtual("createdAtFormatted").get(function () {
    return this.createdAt.toISOString();
});

detectionSchema.methods.toListObject = function () {
    const obj = this.toObject({ virtuals: true });
    delete obj.heatmapFile;
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model("Detection", detectionSchema);