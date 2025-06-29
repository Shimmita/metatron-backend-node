import sharp from "sharp";

export const CompressImageFunction=async(imageBuffer)=>{
    return await sharp(imageBuffer)
    .resize({
      width: 500
    }) // Resize to a max width of 500px
    .toFormat("avif", {
      quality: 80
    }) // Convert to AVIF with 80% quality
    .toBuffer();
}