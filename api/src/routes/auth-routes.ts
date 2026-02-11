import { Router } from "express";
import {
  userLogin,
  userSignup,
  userLogout,
} from "../controllers/auth-controllers.js";
import {
  validate,
  signupValidator,
  loginValidator,
} from "../utils/validators.js";
import {
  authenticateToken,
  authenticateUser,
} from "../middleware/auth-middleware.js";
import { arcjetProtection } from "../middleware/arcjet-middleware.js";

const userRoutes = Router();

userRoutes.use(arcjetProtection);

userRoutes.post("/signup", validate(signupValidator()), userSignup);
userRoutes.post("/login", validate(loginValidator()), userLogin);
userRoutes.get("/verify", authenticateToken, authenticateUser, (_, res) => {
  res.status(200).json({
    message: "User verified successfully",
    name: res.locals.user.name,
    email: res.locals.user.email,
  });
});
userRoutes.get("/logout", userLogout);

export default userRoutes;
