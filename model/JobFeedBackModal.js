import mongoose from "mongoose";

const JobFeedBackModel = new mongoose.Schema({

    name: {
        type: String,
        required: [true, "organisation name is required"],
        trim: true,
    },

    avatar: {
        type: String,
        required: false,
        trim: true,
        default: "",
    },

    title: {
        type: String,
        required: [true, "title of the user required"],
        trim: true,
    },

    country: {
        type: String,
        required: [true, "country  is required"],
        trim: true,
    },

    state: {
        type: String,
        required: [true, "state  is required"],
        trim: true,
    },

    targetId: {
        type: String,
        required: [true, "targetId of user is required"],
        trim: true,
    },


}, {
    timestamps: true,
});

export default mongoose.model("job_feedback", JobFeedBackModel);