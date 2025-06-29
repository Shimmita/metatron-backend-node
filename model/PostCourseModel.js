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

  instructorEmail: {
    type: String,
    required: true,
    trim: true,
    default: ""
  },

  instructorPhone: {
    type: String,
    required: true,
    trim: true,
    default: ""
  },

  instructorSkills: {
    type: [String],
    required: [true, 'instructor skills required'],
  },

  instructorGitHub: {
    type: String,
    required: false,
    trim: true,
    default: ""
  },

  instructorLinkedIn: {
    type: String,
    required: false,
    trim: true,
    default: ""
  },


  instructorWebsite: {
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


  course_rate_count: {
    type: Number,
    required: false,
    default: 0
  },

  student_count: {
    type: Number,
    required: false,
    default: 0
  },

  course_liked: {
    clicks: {
      type: Number,
      required: false,
      default: 0
    },

    clickers: {
      type: [String],
      required: false,
      default: [],
      _id: false
    },
    _id: false,
  },

}, {
  timestamps: true
});

export default mongoose.model("courses", courseModel);