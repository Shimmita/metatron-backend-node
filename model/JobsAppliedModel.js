import mongoose from "mongoose";

const jobAppliedSchema = new mongoose.Schema({
  applicant: {
    name: {
      type: String,
      required: [true, "applicant name is required"],
      trim: true,
    },

    applicantID: {
      type: String,
      required: [true, "applicant ID is required"],
      trim: true,
    },

    gender: {
      type: String,
      required: [true, "applicant gender is required"],
      trim: true,
    },

    country: {
      type: String,
      required: [true, "applicant country is required"],
      trim: true,
    },

    detectedCountry: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    detectedCountryCode: {
      type: String,
      required: false,
      default: "",
      trim: true,
      uppercase: true,
    },

    locationSource: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    _id: false,
  },

  jobID: {
    type: String,
    required: true,
  },

  cvName: {
    type: String,
    required: false,
    default: "",
  },

  viewed: {
    type: Boolean,
    required: false,
    default: false,
  },

  status: {
    type: String,
    required: false,
    default: "pending",
    enum: {
      values: ["pending", "proceed", "rejected"],
      message: "application status must be pending, proceed or rejected",
    },
  }
}, {
  timestamps: true,
});

// Automatically exclude the applicantID field when sending JSON
// coz the current user in the frontend has this ID and also for security reasons,
jobAppliedSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.applicant.ID; // Remove the applicantID field
    return ret;
  },
});

export default mongoose.model("JobApp", jobAppliedSchema);
