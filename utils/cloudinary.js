import { v2 as cloudinary } from "cloudinary";


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads an image buffer to Cloudinary
 * @param {Buffer} buffer - The compressed image buffer
 * @param {string} folder - The folder name in Cloudinary
 * @returns {Promise<Object>} - The Cloudinary upload result
 */

// upload image to cloudinary
export const uploadToCloudinary = (buffer, folder, type="image") => {
  return new Promise(async (resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", public_id: `${Date.now()}` },
      (error, result) => {
        if (error) {
          return reject(new Error(error));
        }
        resolve(result);
      }
    );

    const readableStream = new (await import("stream")).Readable();
    readableStream._read = () => {};
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
};


// upload video to cloudinary
export const uploadVideoToCloudinary = async (buffer, filename, folder) => {
  return new Promise(async (resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video',
        public_id: `videos/${Date.now()}_${filename}`
      },
      (error, result) => {
        if (error) reject(new Error(error));
        else resolve(result);
      }
    );
    // Use readable stream for buffer
    const readableStream = new (await import('stream')).Readable();
    readableStream._read = () => {};
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
};


// upload video to cloudinary with progress
export const uploadVideoToCloudinaryWithProgress = async (buffer, filename, folder, onProgress) => {
  return new Promise(async (resolve, reject) => {
    const totalBytes = buffer.length;
    let uploadedBytes = 0;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video',
        public_id: `videos/${Date.now()}_${filename}`
      },
      (error, result) => {
        if (error) reject(new Error(error));
        else resolve(result);
      }
    );

    const readableStream = new (await import('stream')).Readable();
    readableStream._read = () => {};
    readableStream.push(buffer);
    readableStream.push(null);

    readableStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const percent = Math.round((uploadedBytes / totalBytes) * 100);
      if (onProgress) onProgress(percent);
    });

    readableStream.pipe(stream);
  });
};

// delete video from cloudinary
export const deleteVideoFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
};


// delete image from cloudinary
export const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, {resource_type:'image'}, (error, result) => {
      if (error) reject(new Error("delete operation failed"));
      else resolve(result);
    });
  });
};


