import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: "platform",
  },
  jobGeographicApplicationRestriction: {
    type: Boolean,
    required: false,
    default: false,
  },
  updatedBy: {
    type: String,
    required: false,
    default: "",
    trim: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model("platform_settings", platformSettingsSchema);
