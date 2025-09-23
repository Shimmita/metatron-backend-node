export function handleAuthMiddleware(req, res, next) {

  try {
    // checks if user is online in the session
    const {isOnline}=req.session

    // not online
    if (!isOnline) {
      throw new Error('user session expired')
    }

   // continue with the request
    next()
  } catch (error) {
    res.status(400).send({ login: true, message: "user session expired!" });
  }

}
