import { v2 as cloudinary } from "cloudinary";
import TechPostModal from "../model/TechPostModel.js";
import { uploadToCloudinary, uploadVideoToCloudinary } from "../utils/cloudinary.js";
import { CompressImageFunction } from "../utils/compressImage.js";
import PostCourseModel from "../model/PostCourseModel.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// course limit is 1GB
const COURSE_LIMIT=1000
const MB_CONVERSION=1024*1024


// creating of new course
export const handleCreateNewCourse = async (req, res) => {
  try {
    // Step 1: Basic validation
    if (!req?.files || !req?.files['videos'] || req.files['videos'].length === 0) {
      throw new Error("Please attach course lecture videos");
    }

    // Step 2: Extract and parse the course object
    const dataBody = JSON.parse(req.body?.course);
    const videoFiles = [...req.files['videos']];
    const imageFile = req.files['image']?.[0];

    

    // Step 3: Calculate total file size in MB
    let totalSizeMB = 0;
    videoFiles.forEach(file => {
      totalSizeMB += Math.ceil(file.size / MB_CONVERSION);
    });

    if (totalSizeMB > COURSE_LIMIT) {
      throw new Error("Course exceeded 1GB!");
    }

    // Step 4: Extract video lecture topics from filenames
    dataBody.course_video_topics = videoFiles.map(file =>
      file.originalname.split(".")[0]
    );

    // Step 5: Upload course logo if provided
    if (imageFile?.buffer) {
      const compressedImageBuffer = await CompressImageFunction(imageFile.buffer);

      const logoUploadResult = await uploadToCloudinary(
        compressedImageBuffer,
        process.env.CLOUDINARY_COURSES_IMAGES_FOLDER
      );

      dataBody.course_logo.logoLink = logoUploadResult?.secure_url;
      dataBody.course_logo.logoID = logoUploadResult?.public_id;
    }

    // Step 6: Upload all videos concurrently and collect results
    const uploadedVideos = await Promise.all(
      videoFiles.map(async (file) => {
        const result = await uploadVideoToCloudinary(
          file.buffer,
          file.originalname,
          process.env.CLOUDINARY_COURSES_VIDEOS_FOLDER
        );

        return {
          video_lecture_link: result?.secure_url,
          video_lectureID: result?.public_id
        };
      })
    );

    // Step 7: Attach uploaded video info to the course data
    dataBody.course_video_lectures = uploadedVideos;

    // Step 8: Save to MongoDB
    await PostCourseModel.create(dataBody);

    // Step 9: Send success response
    res.status(200).send("Course uploaded successfully");

  } catch (error) {
    let message = error?.message || "Something went wrong";

    if (message.toLowerCase().includes("cloudinary")) {
      message = "Please check your internet connection";
    } else if (message.toLowerCase().includes("exceeded")) {
      // Keep the same error
    } else {
      message = "Something went wrong. Try again.";
    }

    console.error("Upload error:", error.message);
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
