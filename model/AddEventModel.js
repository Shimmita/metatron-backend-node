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
      default:10
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

  
}, {
  timestamps: true,
});

export default mongoose.model("events", AddEventModel);