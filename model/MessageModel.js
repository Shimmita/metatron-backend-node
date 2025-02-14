import mongoose from "mongoose";

const MessageModel = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "conversation",
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "personal",
    },
    content: { type: String, required: true },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("message", MessageModel);
