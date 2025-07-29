import mongoose from "mongoose";

const EventsRSVPModel = new mongoose.Schema({
  eventId: {
    type: String,
    required: [true, "event Id is required!"],
    trim: true,
  },

  userId:{
    type: String,
    required: [true, "user id making rsvp required!"],
    trim: true,
  },

  userName:{
    type: String,
    required: [true, "user name making rsvp required!"],
    trim: true,
  },
  
  userEmail:{
    type: String,
    required: [true, "user email making rsvp required!"],
    trim: true,
  },

  userGender:{
    type: String,
    required: [true, "user gender making rsvp required!"],
    trim: true,
  },
  userCountry:{
    type: String,
    required: [true, "user country making rsvp required!"],
    trim: true,
  },
  userAvatar:{
    type: String,
    trim: true,
    default:''
  }
  
}, {
  timestamps: true,
});

export default mongoose.model("events_rsvp", EventsRSVPModel);