import mongoose from "mongoose";

const AddEventModel = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "event title is required"],
    trim: true,
  },

  hostLink:{
    type:String,
    trim:true,
    required:true
  },

  skills:{
    type:[String],
    required:[true,'provide array of skills!'],
    default:[],
    trim:true
  },

  users:{
    count:{
      type:Number,
      required:false,
      default:0
    },
    value:{
      type:[String],
      required:false,
      default:[]
    }
  },

  dateHosted:{
    type:Date,
    required:true,
  },

  about:{
    type:String,
    required:[true, 'provide event about'],
    trim:true
  },

  category:{
    type:String,
    required:[true, 'provide event category'],
    trim:true
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
  
  ownerAvatar:{
    type:String,
    trim:true,
  },

   ownerId: {
    type: String,
    required: [true, "userId required"],
    trim: true,
  },

  ownerName: {
    type: String,
    required: [true, "user name required"],
    trim: true,
  },

  ownerSpecialize: {
    type: String,
    required: [true, "user specialisation required"],
    trim: true,
  },

  hostAbout: {
    type: String,
    required: false,
    default: "",
    trim: true,
  },

  hostWebsite: {
    type: String,
    required: false,
    default: "",
    trim: true,
  },

  externalEvent: {
    type: Boolean,
    required: false,
    default: false,
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


  topics: {
    type: [String],
    required: [true, "list of topic(s) required"],
  },

  location: {
    country: {
      type: String,
      required: [true, "user country is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "user city or state is required"],
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

}, {
  timestamps: true,
});

AddEventModel.index({ "source.name": 1, "source.externalId": 1 });
AddEventModel.index({ hostLink: 1 });
AddEventModel.index({ dateHosted: 1 });
AddEventModel.index({ externalEvent: 1 });
AddEventModel.index({ "externalAvailability.status": 1 });

export default mongoose.model("events", AddEventModel);
