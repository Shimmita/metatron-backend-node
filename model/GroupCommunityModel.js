import mongoose from "mongoose";

const GroupCommunityModel = new mongoose.Schema(
  {
    name:{
        type:String,
        required:[true, 'provide the name of group or community']
    },

    members:{
        type:[String],
        default:[]
    },
    total:{
        type:Number,
        default:0
    },
    post_count:{
      type:Number,
      default:0,
    },
    posts:{
      type:[String],
      default:[]
    },

    // temporal values
    isMember:{
      type:Boolean,
      default:false
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("groups", GroupCommunityModel);
