export function handleAuthMiddleware(req, res, next) {
  if (req.session.isOnline) {
    // continue with the request
    next();
  } else {
    // halt the request, user session expired, need to login
    res.status(400).send({ login: true, message: "user session expired!" });
  }
}
