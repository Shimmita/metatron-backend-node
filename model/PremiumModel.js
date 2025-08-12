import mongoose from "mongoose";

const PremiumModel = new mongoose.Schema({
 
  userId:{
    type: String,
    required: [true, "registered user id making upgrade required !"],
    trim: true,
    unique:true
  },

  userEmail:{
    type: String,
    required: [true, "user email making upgrade required!"],
    trim: true,
  },

  method:{
    type: String,
    required: [true, "payment method M-pesa | Paypal | G-pay | Card required !"],
    trim: true,
  },

   transactionId:{
    type: String,
    required: [true, "transaction Id required"],
    trim: true,
    unique:true
  },

  ExpiryDate:{
    type: Date,
    trim: true,
    default:0
  }
  
}, {
  timestamps: true,
});

export default mongoose.model("premium", PremiumModel);