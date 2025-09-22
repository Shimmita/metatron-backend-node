import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    
    email_verified:{
      type:Boolean,
      required:false,
      default:false
    },
    avatar: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    cvLink: {
      type: String,
      required: false,
      default:'',
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    about: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    educationLevel: {
      type: String,
      required: [true, "Education level is required"],
      enum: {
        values: [  
      "High School Diploma",
      "Diploma Certificate",
      "Associate Degree",
      "Bachelors Degree",
      "Masters Degree",
      "Doctorate Degree"
              ],
        message:
          "Invalid education level, should be Certificate, Diploma, Bachelors, Masters or PhD",
      },
    },
    eduInstitution: {
      type: String,
      required: [true, "Education institution is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    portfolio: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    gitHub: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    linkedin: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    county: {
      type: String,
      required: [true, "County is required"],
      trim: true,
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: {
        values: ["Male", "Female", "Other"],
        message: "Gender must be Male, Female or Other",
      },
    },
    specialisationTitle: {
      type: String,
      required: [true, "Specialisation title is required"],
      trim: true,
    },
    selectedSkills: {
      type: [String],
      required: [true, "At least one skill must be selected"],
    },
    avatarID: {
      type: String,
      required: false,
      default: "",
    },
    premium: { type: Boolean, default: false },
    premiumOnce: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    isTutorial:{type:Boolean, default:true},
    isGroupTutorial:{type:Boolean, default:true},
    network: { type: [mongoose.Types.ObjectId], default: [] },
    network_count: { type: Number, default: 0 },
    post_count: { type: Number, default: 0 },
    groups:{
      type:[String],
      required:false,
      default:[]
    }
  },
  {
    timestamps: true,
  }
);

// Automatically exclude the password field when sending JSON
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password; // Remove the password field
    return ret;
  },
});

export default mongoose.model("personal", userSchema);
