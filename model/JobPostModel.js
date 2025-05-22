import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "job title is required"],
    trim: true,
  },
  organisation: {
    name: {
      type: String,
      required: [true, "organisation name is required"],
      trim: true,
    },
    about: {
      type: String,
      required: [true, "provide an about for your organisation"],
      trim: true,
    },
    _id: false,
  },

  jobtypeaccess: {
    type: {
      type: String,
      required: [true, "job type is required"],
      enum: {
        values: ["Contract", "Full-Time"],
        message: "job type must be Contract, or Full-Time",
      },
    },

    access: {
      type: String,
      required: [true, "job accessibility is required"],
      enum: {
        values: ["Remote", "Hybrid", "Onsite"],
        message: "job accessibility must be Remote, Hybrid or Onsite",
      },
    },

    _id: false,
  },

  logo: {
    type: String,
    required: false,
    trim: true,
    default: "",
  },
  logoID: {
    type: String,
    required: false,
    trim: true,
    default: "",
  },
  skills: {
    type: [String],
    required: [true, "At least one skill must be provided"],
  },

  requirements: {
    document: {
      type: String,
      required: [true, "Document application type is required"],
      trim: true,
    },
    qualification: {
      type: [String],
      required: [true, "At least one qualification must be provided"],
      trim: true,
    },
    description: {
      type: [String],
      required: [true, "At least one description must be provided"],
      trim: true,
    },
    _id: false,
  },

  entry: {
    level: {
      type: String,
      required: [true, "level of entry is required"],
      trim: true,
      default: "",
    },
    years: {
      type: String,
      required: [true, "minimum years of experience is required"],
      trim: true,
      default: "",
    },
    _id: false,
  },
  website: {
    type: String,
    trim: true,
    default: "",
  },

  salary: {
    type: String,
    trim: true,
    default: "",
    required: [true, "monthly salary range in KES or USD is required"],
  },

  location: {
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "City or state is required"],
      trim: true,
    },
    _id: false,
  },

  data_email: {
    type: String,
    required: [true, "job application email is required"],
    trim: true,
    lowercase: true,
  },
  my_email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
  },
  my_phone: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true,
  },
  applicants: {
    total: {
      type: Number,
      default: 0,
    },
    male: {
      type: Number,
      default: 0,
    },
    female: {
      type: Number,
      default: 0,
    },
    other: {
      type: Number,
      default: 0,
    },
  },

  // below are temp values that varies based on user job activity

  // tracks current user application status
  currentUserApplied: {
    type: Boolean,
    required: false,
    default: false

  },

  // tracks if cv of the current user was viewed
  viewedCV: {
    type: Boolean,
    required: false,
    default: false

  },

  // tracks cv link of the current user
  cvLink: {
    type: String,
    required: false,
    default: '',
    trim: true,
  },
  // tracks the date of application made by the user
  dateApplied: {
    type: Date,
    required: false
  }
}, {
  timestamps: true,
});

export default mongoose.model("Jobs", jobSchema);