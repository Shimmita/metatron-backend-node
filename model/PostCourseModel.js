import mongoose from "mongoose";
// basic details of the user making course
const instructorDetails = new mongoose.Schema({
  instructorId: {
    type: String,
    required: true
  },
  instructorName: {
    type: String,
    required: true,
    trim: true,
    default: ""
  },

  instructorTitle: {
    type: String,
    required: true,
    trim: true,
    default: ""
  },

  instructorAvatar: {
    type: String,
    required: false,
    trim: true,
    default: ""
  },

  //prevent id generation
  _id: false,
});

// video schema
const videoSchema = new mongoose.Schema({
  video_lecture_link: {
    type: String,
    required: true,
    trim: true
  },

  video_lectureID: {
    type: String,
    required: true,
    trim: true
  },


  //prevent id generation
  _id: false,
})


// main schema
const courseModel = new mongoose.Schema({
  course_instructor: instructorDetails,
  course_title: {
    type: String,
    required: true,
    trim: true
  },
  course_video_lectures: [videoSchema],
  course_video_topics:{
    type: [String],
    trim: true,
    required: true,
    default: []
  },
  course_logo: {
    logoLink: {
      type: String,
      trim: true,
      required: true,
      default: ""
    },
    logoID: {
      type: String,
      trim: true,
      required: false,
      default: ""
    },

    // false id generation
    _id: false,
  },

  course_description: {
    type: String,
    required: true,
    trim: true,
    default: ""
  },

  course_category: {
    main: {
      type: String,
      required: true,
      trim: true,
      default: ""
    },
    sub1: {
      type: String,
      trim: true,
      default: ""
    },
    sub2: {
      type: String,
      trim: true,
      default: ""
    },
    sub3: {
      type: String,
      trim: true,
      default: ""
    },
    sub4: {
      type: String,
      trim: true,
      default: ""
    },
    _id: false,
  },

  course_edited: {
    type: Boolean,
    required: false,
    default: false
  },
  isDisabled: {
    type: Boolean,
    required: false,
    default: false
  },
  disabledReason: {
    type: String,
    required: false,
    default: "",
    trim: true
  },
  disabledBy: {
    type: String,
    required: false,
    default: ""
  },
  disabledAt: {
    type: Date,
    required: false
  },


  course_rate_count: {
    type: Number,
    required: false,
    default: 0
  },

   price: {
    type: Number,
    required: false,
    default:1.2
  },

  student_count: {
    type: Number,
    required: false,
    default: 0
  },

  externalCourse: {
    type: Boolean,
    required: false,
    default: false
  },

  externalUrl: {
    type: String,
    required: false,
    default: "",
    trim: true
  },

  externalProvider: {
    type: String,
    required: false,
    default: "",
    trim: true
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
    scrapedAt: {
      type: Date,
      required: false,
    },
    _id: false,
  },
  
  
  // temp attributes section, affected by auth user 
  // temporary user enrolled status
  currentUserEnrolled: {
    type: Boolean,
    required: false,
    default: false
  },

  // for tracking user rating status, individually
  currentUserRating: {
    type: Number,
    required: false,
    default: 0
  },

  // tracking if user certified in the course
  currentUserCertified:{
    type:Boolean,
    required:false,
    default:false
  },

  // for tracking user certificate ID if they certified
   currentCertId:{
    type:String,
    required:false,
    default:""
  },

  // for tracking user cert date of issue
   currentCertDate:{
    type:Date,
    required:false,
  },

}, {
  timestamps: true
});

courseModel.index({ "source.name": 1, "source.externalId": 1 });
courseModel.index({ externalUrl: 1 });
courseModel.index({ externalCourse: 1 });
courseModel.index({ "externalAvailability.status": 1 });

export default mongoose.model("courses", courseModel);
