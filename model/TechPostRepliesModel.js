import mongoose from "mongoose";

// comment reply schema for the post
const commentReplySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    edited: {
        type: Boolean,
        default: false,
        required: false
    },
    userId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    county: {
        type: String,
        required: true
    },
    
    avatar: {
        type: String,
        required: false,
        default: ""
    },
    minimessage: {
        type: String,
        required: true
    },
    parentCommentId: {
        type: String,
        required: true
    },
    parentCommenterId: {
        type: String,
        required: true
    },
    parentPostId: {
        type: String,
        required: true
    }

}, {
    timestamps: true
});


export default mongoose.model("TechPostReply", commentReplySchema);