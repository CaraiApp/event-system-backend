
const { ApiError } = require("../utils/ApiError.js");
const { asyncHandler}  = require("../utils/asyncHandler.js");
const jwt = require("jsonwebtoken");

const db = require('../modals/index.js');
const User=db.userModel


 const verifyJWT = asyncHandler(async(req, res, next) => {
  try {
      const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
      // console.log(token);
      if (!token) {
          throw new ApiError(401, "Unauthorized request")
      }
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
      const user = await User.findByPk(decodedToken?.id,{
  attributes: { exclude: ['password', 'refreshToken'] },
})
      if (!user) {
          throw new ApiError(401, "Invalid Access Token")
      }
      req.user = user;
      next()
  } catch (error) {
      throw new ApiError(401, error?.message || "Invalid access token")
  }
})
const adminMiddleware = (req, res, next) => {
    // Assuming req.user is set after authentication and contains user roles
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Admins only can do this' });
    }
  };
  const checkPermission = (resource, action) => {
    return asyncHandler(async (req, res, next) => {
      try {
        const userRole = req.user.role; // Assuming user role is attached to req.user
        const role = await Role.findOne({ name: userRole }).populate('permissions');
        console.log(role,"Role")
        if (!role) {
          return next(new ApiError(401, 'Access Denied: Role not found'));
        }
        const hasPermission = role.permissions.some(permission => 
          permission.resource === resource && permission.actions.includes(action)
        );
        if (!hasPermission) {
          return next(new ApiError(403, 'Access Denied: You do not have the required permissions'));
        }
        next();
      } catch (error) {
        console.log("in the catch block also")
        next(new ApiError(500, error.message || 'Server Error'));
      }
    });
  };
const checkEnrollment = (rolesRequired) => {
  return asyncHandler(async (req, res, next) => {
    try {
      const userId = req.user._id; 
      const courseId = req.query.courseId; 
     
      const enrollment = await Enrollment.findOne({ user_id: userId, course_id: courseId });
      if (!enrollment) {
        return next(new ApiError(403, 'you are not enrolled in this course  so enroll your self first'));
      }
      if (!rolesRequired.includes(enrollment.role)) {
        return next(new ApiError(403, `You have need  to be one of the following roles to access this resource: ${rolesRequired.join(',')}`));
      }
      req.enrollment = enrollment;
      next();
    } catch (error) {
      next(new ApiError(500, error.message || 'Server Error'));
    }
  });
};
module.exports={
  verifyJWT,
  adminMiddleware,
  checkPermission,
  checkEnrollment
}  