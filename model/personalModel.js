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
    role: {
      type: String,
      required: true,
      default: "user",
      enum: {
        values: ["admin", "user"],
        message: "Role must be admin or user",
      },
    },
    educationLevel: {
      type: String,
      required: true,
      enum: {
        values: [  
      "High School Diploma",
      "Diploma Certificate",
      "Associate Degree",
      "Bachelors Degree",
      "Masters Degree",
      "Doctorate Degree",
      "Other Qualification",
      ],
        message:
          `Invalid education level, should be 
          High School Diploma,
          Diploma Certificate,
          Associate Degree,
          Bachelors Degree,
          Masters Degree,
          Doctorate Degree, or
          Other Qualification,
          `,
      },
    },
    eduInstitution: {
      type: String,
      required:false,
      default:'',
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
      required:true,
      default:"Other",
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
      required:false,
      default:[]
    },
    avatarID: {
      type: String,
      required: false,
      default: "",
    },

    account: { type: String, required:false, default: "" },
    premium: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    disabledReason: { type: String, required: false, default: "", trim: true },
    disabledBy: { type: String, required: false, default: "" },
    disabledAt: { type: Date, required: false },
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
