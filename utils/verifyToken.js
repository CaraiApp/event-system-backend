import jwt from 'jsonwebtoken'
import User from '../models/User.js'
//custom middlewares

import { ApiResponse } from '../utils/ApiResponse.js';
//1) TO VERIFY TOKEN
export const verifyToken = (req, res, next)=>{
    const token = req.cookies.accessToken
    if(!token){
        return res.status(401).json({status: "failed", success:"false", 
                         message: "You are not authorized"})
    }

    //if token exits then verifying it
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user)=>{
        if(err){
            return res.status(401).json({status: "failed", success:"false", 
                                         message: "Invalid Token"})
        }

        req.user = user
        next()
    })
}
export const verifyJWT = async (req, res, next) => {
    try {
        console.log("verifyJWT middleware running");
        console.log("Headers:", req.headers);
        
        // Extract token from cookies or Authorization header
        const token =
            req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        console.log("Token:", token);

        if (!token) {
            console.log("No token provided");
            return res.status(401).json({
                status: "failed",
                success: "false",
                message: "Unauthorized request - No token provided"
            });
        }
       
        try {
            // Verify the token
            console.log("Verifying token with secret key:", process.env.JWT_SECRET_KEY ? "Secret key exists" : "No secret key");
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
            console.log("Decoded token:", decodedToken);
            
            // Fetch the user from the database
            const user = await User.findById(decodedToken?.id).select("-password");
            console.log("User found:", user ? "Yes" : "No");
            
            if (!user) {
                console.log("User not found in database");
                return res.status(401).json({
                    status: "failed",
                    success: "false",
                    message: "Unauthorized request - User not found"
                });
            }

            // Attach the user to the request object for further use
            req.user = user;
            
            console.log("Authentication successful");
            next(); // Proceed to the next middleware or route handler
        } catch (jwtError) {
            console.error("JWT verification error:", jwtError);
            return res.status(401).json({
                status: "failed",
                success: "false",
                message: "Invalid or expired token"
            });
        }
    } catch (error) {
        console.error("General authentication error:", error);
        res.status(401).json({
            status: "failed",
            success: "false",
            message: error?.message || "Unauthorized request"
        });
    }
}


//2) TO VERIFY USER
export const verifyUser = (req, res, next)=>{

    verifyToken(req, res, next, ()=>{
        if(req.user.id === req.params.id || req.user.role === 'admin'){
            next()
        }else{
            return res.status(401).json({status: "failed", success:"false", 
                                         message: "You are not Authenticated"})
        }
    })

}

//3) TO VERIFY ADMIN
export const verifyAdmin = (req, res, next) => {
    // Ya que estamos usando verifyJWT como middleware antes de este,
    // no necesitamos volver a llamar a verifyToken
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            status: "failed", 
            success: "false", 
            message: "Acceso denegado: Se requieren permisos de administrador"
        });
    }
};

//4) TO VERIFY ORGANIZER
export const verifyOrganizer = (req, res, next) => {
    // Verificar si el usuario es un organizador o un administrador
    if (req.user && (req.user.role === 'organizer' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({
            status: "failed", 
            success: "false", 
            message: "Acceso denegado: Se requieren permisos de organizador"
        });
    }
};
