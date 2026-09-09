import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "job title is required"],
    trim: true,
  },
   category: {
    type: String,
    required: [true, "job specialization is required"],
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
        values: ["Contract", "Full-Time","Internship","Volunteer"],
        message: "job type must be Contract,Full-Time, volunteer or internship",
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

  whitelist: {
    type: String,
    trim: true,
    default: "",
    required: [true, "job country whitelist required!"],
  },

  applicants_max: {
    type: Number,
    default: 500,
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
    required: false,
    default:'',
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
    assessed:{
        type: Number,
        default: 0,
    },
    other: {
      type: Number,
      default: 0,
    },
  },

  status: {
    type: String,
    required: false,
    default: "active",
    enum: {
      values: ["active", "inactive", ],
      message: "job status must be active or inactive",
    },
  },

  isDisabled: {
    type: Boolean,
    required: false,
    default: false,
  },
  disabledReason: {
    type: String,
    required: false,
    default: "",
    trim: true,
  },
  disabledBy: {
    type: String,
    required: false,
    default: "",
  },
  disabledAt: {
    type: Date,
    required: false,
  },
  expiredAt: {
    type: Date,
    required: false,
  },
  expiredReason: {
    type: String,
    required: false,
    default: "",
    trim: true,
  },
  externalAvailability: {
    status: {
      type: String,
      required: false,
      default: "",
      enum: {
        values: ["", "available", "expired", "unknown"],
        message: "availability status must be available, expired or unknown",
      },
    },
    checkedAt: {
      type: Date,
      required: false,
    },
    checkedUrl: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    statusCode: {
      type: Number,
      required: false,
      default: 0,
    },
    reason: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    _id: false,
  },

  source: {
    name: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    externalId: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    postedAt: {
      type: Date,
      required: false,
    },
    scrapedAt: {
      type: Date,
      required: false,
    },
    _id: false,
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


  // tracks doc name of the current user
  cvName: {
    type: String,
    required: false,
    default: '',
    trim: true,
  },
  // tracks the date of application made by the user
  dateApplied: {
    type: Date,
    required: false
  },

  
}, {
  timestamps: true,
});

jobSchema.index({ "source.name": 1, "source.externalId": 1 });
jobSchema.index({ website: 1 });
jobSchema.index({ isDisabled: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ "externalAvailability.status": 1 });

export default mongoose.model("Jobs", jobSchema);
