import personalModel from "../model/personalModel.js";

export async function handleAuthMiddleware(req, res, next) {

  try {
    // checks if user is online in the session
    const {isOnline,userID}=req.session

    // not online
    if (!isOnline) {
      throw new Error('access denied, please login to continue with your request!')
    }

    if (userID) {
      const user = await personalModel.findById(userID).select("isDisabled").lean();
      if (user?.isDisabled) {
        const supportEmail = process.env.DEV_EMAIL || process.env.BREVO_FROM || "technical support";
        throw new Error(`Your Metatron account has been disabled. Contact technical help at ${supportEmail}.`);
      }
    }

   // continue with the request
    next()
  } catch (error) {
    res.status(400).send({ login: true, message: error.message });
  }

}
