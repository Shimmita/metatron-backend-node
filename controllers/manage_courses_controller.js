import { v2 as cloudinary } from "cloudinary";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { Readable } from "stream";
import TechPostModal from "../model/TechPostModel.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// creating of new course
export const handleCreateNewCourse = async (req, res) => {
  try {
    const course_video_url = "";
    const course_video_url_id = "";

    const course_logo_url = "";
    const course_logo_url_id = "";

    // extract the post object from the form data passed as body from frontend
    const data = JSON.parse(req?.body?.course);
    const files = req?.files;

    if (!files) {
      throw new Error("provide course video file");
    }

    // video file is the only sent
    if (files.length < 2) {
      const inputBuffer = files[0].buffer;
      // convert buffer to readable stream for ffmpeg
      const inputStream = new Readable();
      inputStream.push(inputBuffer);
      // no more data to push in the input stream
      inputStream.push(null);

      // creating an outputBuffer
      const outputChunks = [];

      // creating the output stream

      // creating output stream
      const outputStream = new Readable({
        read() {
          if (outputChunks.length) {
            this.push(outputChunks.shift());
          } else {
            // is no more data
            this.push(null);
          }
        },
      });
    } else {
      // contains video and logo for the course
      // upload video to to cloud first
      const inputBuffer = files[0].buffer;
      // convert buffer to readable stream for ffmpeg
      const inputStream = new Readable();
      inputStream.push(inputBuffer);
      // no more data to push in the input stream
      inputStream.push(null);

      // creating an outputBuffer
      const outputChunks = [];

      // creating output stream
      const outputStream = new Readable({
        read() {
          if (outputChunks.length) {
            this.push(outputChunks.shift());
          } else {
            // is no more data
            this.push(null);
          }
        },
      });

      
    }
  } catch (error) {
    let message = `${error.message}`;
    if (message.toLowerCase().includes("cloudinary")) {
      message = "please check your internet connection";
    } else {
      console.log(message);
      message = "something went wrong try again";
    }
    res.status(400).send(message);
  }
};

// get all courses
export const handleGetAllCourses = async (req, res) => {
  try {
    // retrieve all posts in order of latest first
    const allPosts = await TechPostModal.find({})
      .sort({ createdAt: -1 })
      .limit(20);
    // posts not made its empty
    if (allPosts.length < 1) {
      throw new Error("sorry, there are no courses uploaded yet");
    }

    // posts are present
    res.status(200).send(allPosts);
  } catch (error) {
    res.status(400).send(error.message);
  }
};

// get specific post or one post
const handleGetSpecificCourse = async () => {
  const id = req?.params.id;
};

// edit post
export const handleUpdateCourse = async (req, res) => {
  // get the body
  const body = req?.body;
  // obtain id passed as params
  const id = req.params.id;

  try {
    await TechPostModal.findByIdAndUpdate(
      { _id: id },
      { $set: { post_body: body } }
    );

    res.status(200).send("post updated successfully");
  } catch (error) {
    res.status(400).send("failed to update post " + error.message);
  }
};

export const handleDeleteCourse = async (req, res) => {
  // get the req params value id of the post to be deleted
  const id = req.params.id;
  console.log(id);
};
