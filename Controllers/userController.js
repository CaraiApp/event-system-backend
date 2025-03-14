// import User from '../models/User.js'
// import jwt from "jsonwebtoken";

// //1) TO CREATE A NEW USER
// // export const createNewUser = async (req, res)=>{
// //     const newUser = new User({
// //         username: req.body.username,
// //         email: req.body.email,  
// //         password: req.body.password,                                 
// //         role: req.body.role ? req.body.role : "user",
// //         photo: req.body.photo
// //     })
// //     try{
        
// //         const savedUser = await newUser.save()
// //         console.log(savedUser)
// //         res.status(201).json({status: "success", success:"true", 
// //                              message: "User Sucessfully Created", data: savedUser})

// //     }catch(err){
// //         res.status(500).json({status: "failed", success:"false",
// //                              message: "User Cannot be Created. Try again"})
// //     }
// // }
// export const createNewUser = async (req, res) => {
//     const { username, email, password, role } = req.body;
//     const file = req.file?.path; // Multer saves the uploaded file locally
//     let photoUrl = null;

//     try {
//         // Step 1: Upload the photo to Cloudinary if a file is provided
//         if (file) {
//             const cloudinaryResponse = await uploadOnCloudinary(file, 'users');

//             if (cloudinaryResponse) {
//                 photoUrl = cloudinaryResponse.secure_url; // Use Cloudinary secure URL
//                 console.log('Cloudinary URL:', photoUrl);
//             } else {
//                 return res.status(500).json({
//                     status: 'failed',
//                     success: 'false',
//                     message: 'Photo upload to Cloudinary failed. User not created.',
//                 });
//             }
//         }

//         // Step 2: Create a new User instance with data and Cloudinary URL
//         const newUser = new User({
//             username,
//             email,
//             password, // Ensure you hash the password in the model or here before saving
//             role,
//             photo: photoUrl, // Cloudinary photo URL
//         });

//         console.log('New User:', newUser);

//         // Step 3: Save the user to the database
//         const savedUser = await newUser.save();

//         // Step 4: Send success response
//         res.status(201).json({
//             status: 'success',
//             success: 'true',
//             message: 'User successfully created',
//             data: savedUser,
//         });

//     } catch (err) {
//         console.error('Error creating user:', err);

//         res.status(500).json({
//             status: 'failed',
//             success: 'false',
//             message: 'User cannot be created. Try again.',
//             error: err.message,
//         });
//     } finally {
//         // Step 5: Clean up the locally uploaded file if it exists
//         if (file) {
//             import('fs').then(fs => {
//                 if (fs.existsSync(file)) {
//                     fs.unlinkSync(file); // Delete the file locally
//                 }
//             });
//         }
//     }
// };

// export const loginUser = async (req, res) => {
//     const { email, password } = req.body;
// console.log(`User ${email}, ${password}`)
//     try {
//         // Check if the user exists
//         const user = await User.findOne({ email });
//         console.log(user,"user")
//         if (!user) {
//             return res.status(404).json({
//                 status: "failed",
//                 success: "false",
//                 message: "User not found",
//             });
//         }

//         // Validate password
//         const isPasswordValid = await user.comparePassword(password);
//         console.log(isPasswordValid,"isPassword")
//         if (!isPasswordValid) {
//             return res.status(401).json({
//                 status: "failed",
//                 success: "false",
//                 message: "Invalid credentials",
//             });
//         }
// console.log(process.env.JWT_SECRET_KEY,"process.env.JWT_SECRET")
//         // Create JWT token
//         const token = jwt.sign(
//             { id: user._id, role: user.role }, 
//             process.env.JWT_SECRET_KEY,           
//             { expiresIn: "1d" }              
//         );

//         // Send response with token
//         res.status(200).json({
//             status: "success",
//             success: "true",
//             message: "Login successful",
//             data: {
//                 token,
//                 user: {
//                     id: user._id,
//                     username: user.username,
//                     email: user.email,
//                     role: user.role,
//                 },
//             },
//         });
//     } catch (err) {
//         res.status(500).json({
//             status: "failed",
//             success: "false",
//             message: "Login failed",
//             error: err.message,
//         });
//     }
// };
// //2) TO UPDATE A USER
// // export const updateUser = async (req, res) =>{

// //     const id = req.query.id

// //     try{
// //         const updateUser = await User.findByIdAndUpdate(id, {$set: req.body}, {new: true})
// //         res.status(200).json({status: "success", success:"true", 
// //                              message: "User Sucessfully Updated", data: updateUser})

// //     }catch(err){
// //          res.status(500).json({status: "failed", success:"false",
// //                              message: "User Cannot be Updated. Try again"})
// //     }
// // }


// export const updateUser = async (req, res) => {
//     const id = req.query.id;
//     const file = req.file?.path; // Multer saves the uploaded file locally
//     let photoUrl = null;

//     try {
//         // Step 1: Handle photo upload if a file is provided
//         if (file) {
//             const cloudinaryResponse = await uploadOnCloudinary(file, 'users');

//             if (cloudinaryResponse) {
//                 photoUrl = cloudinaryResponse.secure_url; // Use Cloudinary secure URL
//                 console.log('Cloudinary URL:', photoUrl);
//             } else {
//                 return res.status(500).json({
//                     status: 'failed',
//                     success: 'false',
//                     message: 'Photo upload to Cloudinary failed. User not updated.',
//                 });
//             }
//         }

//         // Step 2: Prepare update object
//         const updateData = { ...req.body };
//         if (photoUrl) {
//             updateData.photo = photoUrl; // Add Cloudinary photo URL if provided
//         }

//         // Step 3: Update user in the database
//         const updatedUser = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true });

//         if (!updatedUser) {
//             return res.status(404).json({
//                 status: 'failed',
//                 success: 'false',
//                 message: 'User not found. Update failed.',
//             });
//         }

//         // Step 4: Send success response
//         res.status(200).json({
//             status: 'success',
//             success: 'true',
//             message: 'User successfully updated',
//             data: updatedUser,
//         });

//     } catch (err) {
//         console.error('Error updating user:', err);

//         res.status(500).json({
//             status: 'failed',
//             success: 'false',
//             message: 'User cannot be updated. Try again.',
//             error: err.message,
//         });
//     } finally {
//         // Step 5: Clean up the locally uploaded file if it exists
//         if (file) {
//             import('fs').then(fs => {
//                 if (fs.existsSync(file)) {
//                     fs.unlinkSync(file); // Delete the file locally
//                 }
//             });
//         }
//     }
// };

// //3) TO DELETE A USER
// export const deleteUser = async (req, res) =>{

//     const id = req.query.id

//     try{
//         await User.findByIdAndDelete(id)
//         res.status(200).json({status: "success", success:"true", 
//                              message: "User Sucessfully Deleted"})

//     }catch(err){
//          res.status(500).json({status: "failed", success:"false",
//                              message: "User Cannot be Deleted. Try again"})
//     }
// }

// //4) TO GET A SINGLE USER
// // export const getSingleUser = async (req, res) =>{
// // console.log("GET")
// //     const id = req.query.id
  
// //     try{
// //         const singleUser = await User.findOne({_id:id})
        
// //         res.status(200).json({status: "success", success:"true", 
// //                              message: "Sucessful", data: singleUser})

// //     }catch(err){
// //          res.status(404).json({status: "failed", success:"false",
// //                              message: "Error: User Data Not Found."})
// //     }
// // }
// export const getSingleUser = async (req, res) => {
//     console.log("GET Request for Single User");

//     // Admins can pass the user ID in query; regular users access their own data
//     const id = req.query.id || req.user._id;

//     try {
//         // Find user by ID
//         const singleUser = await User.findOne({ _id: id }).select("-password -refreshToken"); // Exclude sensitive fields
        
//         if (!singleUser) {
//             return res.status(404).json({
//                 status: "failed",
//                 success: "false",
//                 message: "Error: User data not found.",
//             });
//         }

//         res.status(200).json({
//             status: "success",
//             success: "true",
//             message: "Successful",
//             data: singleUser,
//         });
//     } catch (err) {
//         res.status(500).json({
//             status: "failed",
//             success: "false",
//             message: "Error: Could not fetch user data.",
//             error: err.message,
//         });
//     }
// };

// //5) TO GET ALL USERS
// export const getAllUsers = async (req, res) =>{

//     try{
//         const allUsers = await User.find({})
//         res.status(200).json({status: "success", success:"true",
//                              message: "Sucessful", count: allUsers.length, data: allUsers})

//     }catch(err){
//          res.status(404).json({status: "failed", success:"false",
//                              message: "Error: Data Not Found."})
//     }
// }
// .............................updated AbortController............................................
import User from '../models/User.js';
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { uploadOnCloudinary } from '../utils/cloudinary.js';

/**
 * Helper function to upload photos to Cloudinary.
 * @param {string} filePath - The local file path of the photo.
 * @param {string} folder - The folder in Cloudinary.
 * @returns {Promise<string|null>} - The Cloudinary URL or null if upload fails.
 */
const uploadPhoto = async (filePath, folder) => {
    try {
        const cloudinaryResponse = await uploadOnCloudinary(filePath, folder);
        return cloudinaryResponse?.secure_url || null;
    } catch (error) {
        console.error('Error al subir la foto a Cloudinary:', error);
        return null;
    }
};

// 1) Crear un nuevo usuario
export const createNewUser = async (req, res) => {
    console.log("createNewUser called with URL:", req.originalUrl);
    console.log("Request method:", req.method);
    console.log("Request headers:", req.headers);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log("Received OPTIONS request, responding with 200");
        return res.status(200).json({ message: 'CORS preflight OK' });
    }
    
    // Extract data from the body
    let userData = req.body;
    
    // Sometimes the body might be a string if the client sends data incorrectly
    if (typeof userData === 'string') {
        try {
            userData = JSON.parse(userData);
        } catch (e) {
            console.error("Failed to parse request body string:", e);
        }
    }
    
    console.log("Request body for createUser:", userData);
    
    const { username, email, password, role = 'usuario', fullname } = userData || {};
    const file = req.file?.path;

    try {
        // Check if required fields are present
        if (!username || !email || !password) {
            return res.status(400).json({
                status: 'fallido',
                success: 'false',
                message: 'Se requieren nombre de usuario, correo electrónico y contraseña.',
            });
        }

        // Check if user with same email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                status: 'fallido',
                success: 'false',
                message: 'Ya existe un usuario con este correo electrónico.',
            });
        }

        const photoUrl = file ? await uploadPhoto(file, 'users') : null;

        const newUser = new User({
            username,
            email,
            password,
            role,
            photo: photoUrl,
            fullname,
        });

        const savedUser = await newUser.save();
        console.log("User created successfully:", savedUser);
        
        res.status(201).json({
            status: 'éxito',
            success: 'true',
            message: 'El usuario ha sido creado exitosamente.',
            data: savedUser,
        });
    } catch (err) {
        console.error('Error al crear el usuario:', err);
        
        // Handle mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({
                status: 'fallido',
                success: 'false',
                message: 'Error de validación.',
                errors: messages,
            });
        }
        
        // Handle duplicate key error (likely email or username)
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            return res.status(409).json({
                status: 'fallido',
                success: 'false',
                message: `El ${field === 'email' ? 'correo electrónico' : 'nombre de usuario'} ya está en uso.`,
            });
        }
        
        res.status(500).json({
            status: 'fallido',
            success: 'false',
            message: 'No se pudo crear el usuario. Por favor, inténtalo de nuevo.',
            error: err.message,
        });
    } finally {
        if (file) {
            import('fs').then(fs => fs.existsSync(file) && fs.unlinkSync(file));
        }
    }
};

// 2) Iniciar sesión
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                status: 'fallido',
                success: 'false',
                message: 'El correo electrónico o la contraseña son incorrectos.',
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'fallido',
                success: 'false',
                message: 'El correo electrónico o la contraseña son incorrectos.',
            });
        }

        const tokenPayload = {
            id: user._id,
            email: user.email,
            role: user.role,
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, { expiresIn: '30d' });

        res.status(200).json({
            status: 'éxito',
            success: 'true',
            message: 'Inicio de sesión exitoso.',
            data: {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    fullname: user.fullname,
                    photo: user.photo,
                },
            },
        });
    } catch (err) {
        console.error('Error durante el inicio de sesión:', err);
        res.status(500).json({
            status: 'fallido',
            success: 'false',
            message: 'Hubo un error durante el inicio de sesión. Por favor, inténtalo de nuevo.',
            error: err.message,
        });
    }
};

// 3) Actualizar un usuario
export const updateUser = async (req, res) => {
    const id = req.query.id || req.user._id;
    const file = req.file?.path;
    const { password, ...updateFields } = req.body;

    try {
        if (file) {
            const photoUrl = await uploadPhoto(file, 'users');
            if (photoUrl) {
                updateFields.photo = photoUrl;
            }
        }

        if (password) {
            updateFields.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                status: 'fallido',
                success: 'false',
                message: 'No se pudo encontrar el usuario. Actualización fallida.',
            });
        }

        res.status(200).json({
            status: 'éxito',
            success: 'true',
            message: 'El usuario ha sido actualizado exitosamente.',
            data: updatedUser,
        });
    } catch (err) {
        console.error('Error al actualizar el usuario:', err);
        res.status(500).json({
            status: 'fallido',
            success: 'false',
            message: 'No se pudo actualizar el usuario. Por favor, inténtalo de nuevo.',
            error: err.message,
        });
    } finally {
        if (file) {
            import('fs').then(fs => fs.existsSync(file) && fs.unlinkSync(file));
        }
    }
};

// 4) Eliminar un usuario
export const deleteUser = async (req, res) => {
    const id = req.query.id;

    try {
        await User.findByIdAndDelete(id);
        res.status(200).json({
            status: 'éxito',
            success: 'true',
            message: 'El usuario ha sido eliminado exitosamente.',
        });
    } catch (err) {
        console.error('Error al eliminar el usuario:', err);
        res.status(500).json({
            status: 'fallido',
            success: 'false',
            message: 'No se pudo eliminar el usuario. Por favor, inténtalo de nuevo.',
            error: err.message,
        });
    }
};

// 5) Obtener un usuario único
export const getSingleUser = async (req, res) => {
    const id = req.query.id || req.user._id;

    try {
        const singleUser = await User.findOne({ _id: id }).select("-password -refreshToken");

        if (!singleUser) {
            return res.status(404).json({
                status: 'fallido',
                success: 'false',
                message: 'No se pudo encontrar los datos del usuario.',
            });
        }

        res.status(200).json({
            status: 'éxito',
            success: 'true',
            message: 'Éxito.',
            data: singleUser,
        });
    } catch (err) {
        console.error('Error al obtener los datos del usuario:', err);
        res.status(500).json({
            status: 'fallido',
            success: 'false',
            message: 'No se pudo obtener los datos del usuario.',
            error: err.message,
        });
    }
};

// 6) Obtener todos los usuarios
export const getAllUsers = async (req, res) => {
    try {
        const allUsers = await User.find({});
        res.status(200).json({
            status: 'éxito',
            success: 'true',
            message: 'Éxito.',
            count: allUsers.length,
            data: allUsers,
        });
    } catch (err) {
        console.error('Error al obtener todos los usuarios:', err);
        res.status(404).json({
            status: 'fallido',
            success: 'false',
            message: 'No se pudo encontrar los datos.',
            error: err.message,
        });
    }
};
