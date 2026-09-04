import mongoose from "mongoose";

const ConversationModel = new mongoose.Schema(
  {
    participants: [{ type: String, required: true, ref: "personal" }],
    lastMessage: { type: String },
    updatedAt: { type: Date, default: Date.now },
    senderName: { type: String, required: true },
    senderAvatar: { type: String, required: false, default: "" },
    targetName: { type: String, required: true },
    targetAvatar: { type: String, required: false, default: "" },
    isTargetRead: { type: Boolean, default: false },
    lastSenderId: { type: String, required: true, ref: "personal" },
    adminThread: { type: Boolean, default: false },
    adminUserId: { type: String, required: false, default: "" },
    userParticipantId: { type: String, required: false, default: "" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("conversation", ConversationModel);
