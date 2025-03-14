import Booking from '../models/Booking.js'
import Event from '../models/Event.js'
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
 import QRCode from 'qrcode'; 
// //1) TO CREATE A BOOKING
// // export const createBooking = async (req, res)=>{

// //     const { timeslot_id, bookingDate, event_id,user_id } = req.body;

// //     // Check if there's an existing booking for event at the selected timeslot and date
// //     const existingBooking = await Booking.findOne({event_id,user_id});

// //     if (existingBooking) {
// //         return res.status(400).json({status: "failed",success: "false",
// //                                      message: "Cannot book at that slot, already booked"});
// //     }
// //     const newBooking = new Booking(req.body)
// //     try{
// //         const savedBooking = await newBooking.save()
// //         res.status(200).json({status: "success", success:"true", 
// //                                  message: "Your Booking is Booked", data: savedBooking})

// //     }catch(err){
// //         res.status(500).json({status: "failed", success:"false", 
// //                                  message: "Failed to Book Booking"})
// //     }
// // }
// // export const createBooking = async (req, res) => {
// //     const { bookingDate, event_id, user_id, guestSize, seatNumbers } = req.body;
// //     try {
// //         // Check if there's an existing booking for the user at the selected event and date
// //         const existingBooking = await Booking.findOne({ event_id, user_id });
// //         if (existingBooking) {
// //             return res.status(400).json({
// //                 status: "failed",
// //                 success: "false",
// //                 message: "Cannot book at that event, already booked",
// //             });
// //         }

// //         // Check if any of the requested seats are already booked for the event and date
// //         const conflictingSeats = await Booking.find({
// //             event_id,
// //             bookingDate,
// //             seatNumbers: { $in: seatNumbers },
// //         });

// //         if (conflictingSeats.length > 0) {
// //             return res.status(400).json({
// //                 status: "failed",
// //                 success: "false",
// //                 message: "Some of the selected seats are already booked",
// //                 conflictingSeats: conflictingSeats.map(booking => booking.seatNumbers).flat(),
// //             });
// //         }

// //         // Create a new booking
// //         const newBooking = new Booking({
// //             user_id,
// //             event_id,
// //             bookingDate,
// //             guestSize,
// //             seatNumbers,
// //         });

// //         // Save the booking
// //         const savedBooking = await newBooking.save();

// //         // Populate relevant details (user, event)
// //         const populatedBooking = await Booking.findById(savedBooking._id)
// //             .populate('user_id', 'username email')
// //             .populate('event_id', 'name desc venue');

// //         // Send response with detailed information
// //         res.status(200).json({
// //             status: "success",
// //             success: "true",
// //             message: "Your Booking is Booked",
// //             data: populatedBooking,
// //         });
// //     } catch (err) {
// //         res.status(500).json({
// //             status: "failed",
// //             success: "false",
// //             message: "Failed to Book Booking",
// //             error: err.message,
// //         });
// //     }
// // };
// //.........................createBooking.....................................................
// // export const createBooking = async (req, res) => {
// //     const { bookingDate, event_id, user_id, guestSize, seatNumbers } = req.body;

// //     try {
// //         // Fetch the event details to validate seats and pricing
// //         const event = await Event.findById(event_id);
// //         if (!event) {
// //             return res.status(404).json({
// //                 status: "failed",
// //                 success: "false",
// //                 message: "Event not found",
// //             });
// //         }

// //         // Check if there's an existing booking for the user at the selected event and date
// //         const existingBooking = await Booking.findOne({ event_id, user_id });
// //         if (existingBooking) {
// //             return res.status(400).json({
// //                 status: "failed",
// //                 success: "false",
// //                 message: "Cannot book at that event, already booked",
// //             });
// //         }

// //         // Check if any of the requested seats are already booked for the event and date
// //         const conflictingSeats = await Booking.find({
// //             event_id,
// //             bookingDate,
// //             seatNumbers: { $in: seatNumbers },
// //         });

// //         if (conflictingSeats.length > 0) {
// //             return res.status(400).json({
// //                 status: "failed",
// //                 success: "false",
// //                 message: "Some of the selected seats are already booked",
// //                 conflictingSeats: conflictingSeats.map(booking => booking.seatNumbers).flat(),
// //             });
// //         }

// //         // Determine the total booking price based on seat types
// //         let totalPrice = 0;
// //         const vipSeats = new Set(Array.from({ length: event.vipSize }, (_, i) => i + 1));

// //         seatNumbers.forEach(seat => {
// //             if (vipSeats.has(seat)) {
                
// //                 totalPrice += event.vipprice;
// //             } else {
                
// //                 totalPrice += event.economyprice;
// //             }
// //         });

// //         // Create a new booking
// //         const newBooking = new Booking({
// //             user_id,
// //             event_id,
// //             bookingDate,
// //             guestSize,
// //             seatNumbers,
// //             totalPrice,
// //         });

// //         // Save the booking
// //         const savedBooking = await newBooking.save();

// //         // Update the available seats for the event
// //         event.availableSeats = event.availableSeats.filter(seat => !seatNumbers.includes(seat));
// //      const updatedEvent  = await event.save();
      
// //         // Populate relevant details (user, event)
// //         const populatedBooking = await Booking.findById(savedBooking._id)
// //             .populate('user_id', 'username email')
// //             .populate('event_id', 'name desc venue');

// //         // Send response with detailed information
// //         res.status(200).json({
// //             status: "success",
// //             success: "true",
// //             message: "Your Booking is Booked",
// //             data: populatedBooking,
// //         });
// //     } catch (err) {
// //         res.status(500).json({
// //             status: "failed",
// //             success: "false",
// //             message: "Failed to Book Booking",
// //             error: err.message,
// //         });
// //     }
// // };
// //........................With QR Code..............................
// import QRCode from 'qrcode'; 

// // export const createBooking = async (req, res) => {
// //     const { bookingDate, event_id, user_id, guestSize, seatNumbers ,totalPrice} = req.body;
// //     try {
// //         // Fetch the event details to validate seats and pricing
// //         const event = await Event.findById(event_id);
// //         if (!event) {
// //             return res.status(404).json({
// //                 status: "failed",
// //                 success: "false",
// //                 message: "Event not found",
// //             });
// //         }

// //         // Check if there's an existing booking for the user at the selected event and date
// //         const existingBooking = await Booking.findOne({ event_id, user_id });
// //         if (existingBooking) {
// //             return res.status(400).json({
// //                 status: "failed",
// //                 success: "false",
// //                 message: "Cannot book at that event, already booked",
// //             });
// //         }

// //         // Check if any of the requested seats are already booked for the event and date
// //         const conflictingSeats = await Booking.find({
// //             event_id,
// //             bookingDate,
// //             seatNumbers: { $in: seatNumbers },
// //         });

// //         if (conflictingSeats.length > 0) {
// //             return res.status(400).json({
// //                 status: "failed",
// //                 success: "false",
// //                 message: "Some of the selected seats are already booked",
// //                 conflictingSeats: conflictingSeats.map(booking => booking.seatNumbers).flat(),
// //             });
// //         }

// //         // Determine the total booking price based on seat types
     
// //         const vipSeats = new Set(Array.from({ length: event.vipSize }, (_, i) => i + 1));

// //         // seatNumbers.forEach(seat => {
// //         //     if (vipSeats.has(seat)) {
// //         //         totalPrice += event.vipprice;
// //         //     } else {
// //         //         totalPrice += event.economyprice;
// //         //     }
// //         // });

// //         // Create a new booking
// //         const newBooking = new Booking({
// //             user_id,
// //             event_id,
// //             bookingDate,
// //             guestSize,
// //             seatNumbers,
// //             totalPrice,
// //         });

// //         // Save the booking
// //         const savedBooking = await newBooking.save();

// //         // Update the available seats for the event
// //         event.availableSeats = event.availableSeats.filter(seat => !seatNumbers.includes(seat));
// //         const updatedEvent = await event.save();
      
// //         // Populate relevant details (user, event)
// //         const populatedBooking = await Booking.findById(savedBooking._id)
// //             .populate('user_id', 'username email')
// //             .populate('event_id', 'name desc venue');

// //         // Generate the QR code data (use the booking ID or any relevant details)
// //         const qrCodeData = JSON.stringify({
// //             bookingId: savedBooking._id,
// //             event: event.name,
// //             user: populatedBooking.user_id.username,
// //             date: bookingDate,
// //             totalPrice,
// //         });

// //         const qrCode = await QRCode.toDataURL(qrCodeData);

// //         // Send response with detailed information and QR code
// //         res.status(200).json({
// //             status: "success",
// //             success: "true",
// //             message: "Your Booking is Booked",
// //             data: populatedBooking,
// //             qrCode, // Include QR code as base64 URL
// //         });
// //     } catch (err) {
// //         res.status(500).json({
// //             status: "failed",
// //             success: "false",
// //             message: "Failed to Book Booking",
// //             error: err.message,
// //         });
// //     }
// // };

// //2) TO GET BOOKING DETAILS BY ID
// export const createBooking = async (req, res) => {
//     const { bookingDate, event_id, user_id, guestSize, seatNumbers,totalPrice } = req.body;

//     try {
//         // Fetch the event details to validate seats and pricing
//         const event = await Event.findById(event_id);
//         if (!event) {
//             return res.status(404).json({
//                 status: "failed",
//                 success: "false",
//                 message: "Event not found",
//             });
//         }

//         // Check if there's an existing booking for the user at the selected event and date
//         // const existingBooking = await Booking.findOne({ event_id, user_id });
//         // if (existingBooking) {
//         //     return res.status(400).json({
//         //         status: "failed",
//         //         success: "false",
//         //         message: "Cannot book at that event, already booked",
//         //     });
//         // }

//         // Check if any of the requested seats are already booked for the event and date
//         // const conflictingSeats = await Booking.find({
//         //     event_id,
//         //     bookingDate,
//         //     seatNumbers: { $in: seatNumbers },
//         // });

//         // if (conflictingSeats.length > 0) {
//         //     return res.status(400).json({
//         //         status: "failed",
//         //         success: "false",
//         //         message: "Some of the selected seats are already booked",
//         //         conflictingSeats: conflictingSeats.map(booking => booking.seatNumbers).flat(),
//         //     });
//         // }
//         // Determine the total booking price based on seat types
//         // let totalPrice = 0;
//         // const vipSeats = new Set(Array.from({ length: event.vipSize }, (_, i) => i + 1));

//         // seatNumbers.forEach(seat => {
//         //     if (vipSeats.has(seat)) {
//         //         totalPrice += event.vipprice;
//         //     } else {
//         //         totalPrice += event.economyprice;
//         //     }
//         // });

//         // Create a new booking
//         const newBooking = new Booking({
//             user_id,
//             event_id,
//             bookingDate,
//             guestSize,
//             seatNumbers,
//             totalPrice,
//         });

//         // Save the booking
//         const savedBooking = await newBooking.save();

//         // Update the available seats for the event
//         event.availableSeats = event.availableSeats.filter(seat => !seatNumbers.includes(seat));
//         const updatedEvent = await event.save();

//         // Populate relevant details (user, event)
//         const populatedBooking = await Booking.findById(savedBooking._id)
//             .populate('user_id', 'username email')
//             .populate('event_id', 'name desc venue');

//         // Generate the QR code data (use the booking ID or any relevant details)
//         const qrCodeData = JSON.stringify({
//             bookingId: savedBooking._id,
//             event: event.name,
//             user: populatedBooking.user_id.username,
//             date: bookingDate,
//             totalPrice,
//         });

//         // Generate QR code as Base64
//         const qrCodeBase64 = await QRCode.toDataURL(qrCodeData);

//         // Upload QR code to Cloudinary using your middleware
//         const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
//             folder: "event_bookings", // Optional: Specify folder
//             public_id: `booking_${savedBooking._id}`, // Optional: Unique identifier
//         });

//         // Send response with detailed information and Cloudinary QR code URL
//         res.status(200).json({
//             status: "success",
//             success: "true",
//             message: "Your Booking is Booked",
//             data: populatedBooking,
//             qrCodeUrl: qrCodeUploadResponse.secure_url, // Cloudinary QR code URL
//         });
//     } catch (err) {
//         res.status(500).json({
//             status: "failed",
//             success: "false",
//             message: "Failed to Book Booking",
//             error: err.message,
//         });
//     }
// };

// export const getBooking = async (req, res)=>{

//     const _id = req.query.id

//     try{
//         const singleBooking = await Booking.findById(_id)
//         res.status(200).json({status: "success", success:"true", 
//                                  message: "Succesful", data: singleBooking})

//     }catch(err){
//         res.status(404).json({status: "failed", success:"false", 
//                                  message: "Booking Not Found"})
//     }
// }
// export const getUserBookings = async (req, res) => {
//     const user_id = req.query.user_id;
// console.log(user_id,"user_id")
//     try {
//         const userBookings = await Booking.find({ user_id }).populate('event_id', 'name venue');
//         res.status(200).json({
//             status: "success",
//             success: "true",
//             message: "User bookings retrieved successfully",
//             data: userBookings,
//         });
//     } catch (err) {
//         res.status(500).json({
//             status: "failed",
//             success: "false",
//             message: "Failed to retrieve user bookings",
//             error: err.message,
//         });
//     }
// };
// export const getEventBookings = async (req, res) => {
//     const event_id = req.query.event_id;

//     try {
//         const eventBookings = await Booking.find({ event_id }).populate('user_id', 'username email');
//         res.status(200).json({
//             status: "success",
//             success: "true",
//             message: "Event bookings retrieved successfully",
//             data: eventBookings,
//         });
//     } catch (err) {
//         res.status(500).json({
//             status: "failed",
//             success: "false",
//             message: "Failed to retrieve event bookings",
//             error: err.message,
//         });
//     }
// };

// //3) TO GET All BOOKINGS DETAILS
// export const getAllBookings = async (req, res)=>{

//     try{
//         const allBookings = await Booking.find()
//         res.status(200).json({status: "success", success:"true", 
//                                  message: "Succesful", count: allBookings.length, data: allBookings})

//     }catch(err){
//         res.status(500).json({status: "failed", success:"false", 
//                                  message: "Internal Server Error"})
//     }
// }

// //4) TO DELETE A BOOKING
// export const deleteBooking = async (req, res) =>{

//     const id = req.params.id

//     try{
//         await Booking.findByIdAndDelete(id)
//         res.status(200).json({status: "success", success:"true", 
//                              message: "Booking Sucessfully Deleted"})

//     }catch(err){
//          res.status(500).json({status: "failed", success:"false",
//                              message: "Booking Cannot be Deleted. Try again"})
//     }
// }

// //5) TO UPDATE A BOOKING
// export const updateBooking = async (req, res) =>{

//     const _id = req.query.id

//     try{
//         const updateBooking = await Booking.findByIdAndUpdate(_id, {$set: req.body}, {new: true})
//         res.status(200).json({status: "success", success:"true", 
//                              message: "Booking Sucessfully Updated", data: updateBooking})

//     }catch(err){
//          res.status(500).json({status: "failed", success:"false",
//                              message: "Booking Cannot be Updated. Try again"})
//     }
// }
// 1) To get a single booking by ID
// export const createBooking = async (req, res) => {
//     const { bookingDate, event_id, user_id, guestSize, seatNumbers, totalPrice } = req.body;

//     try {
//         // Fetch the event details to validate seats and pricing
//         const evento = await Event.findById(event_id);
//         if (!evento) {
//             return res.status(404).json({
//                 status: "failed",
//                 success: "false",
//                 message: "Evento no encontrado",
//             });
//         }

//         // Check if there's an existing booking for the user at the selected event and date
//         const existingBooking = await Booking.findOne({ event_id, user_id, bookingDate });
//         if (existingBooking) {
//             return res.status(400).json({
//                 status: "failed",
//                 success: "false",
//                 message: "Ya has reservado para este evento en esta fecha",
//             });
//         }

//         // Check if any of the requested seats are already booked for the event and date
//         const conflictingSeats = await Booking.find({
//             event_id,
//             bookingDate,
//             seatNumbers: { $in: seatNumbers },
//         });

//         if (conflictingSeats.length > 0) {
//             return res.status(400).json({
//                 status: "failed",
//                 success: "false",
//                 message: "Algunos de los asientos seleccionados ya están reservados",
//                 conflictingSeats: conflictingSeats.map(booking => booking.seatNumbers).flat(),
//             });
//         }

//         // Create a new booking
//         const nuevaReserva = new Booking({
//             user_id,
//             event_id,
//             bookingDate,
//             guestSize,
//             seatNumbers,
//             totalPrice,
//         });

//         // Save the booking
//         const reservaGuardada = await nuevaReserva.save();

//         // Update the available seats for the event
//         evento.availableSeats = evento.availableSeats.filter(seat => !seatNumbers.includes(seat));
//         const eventoActualizado = await evento.save();

//         // Populate relevant details (user, event)
//         const reservaPoblada = await Booking.findById(reservaGuardada._id)
//             .populate('user_id', 'username email')
//             .populate('event_id', 'name desc venue');

//         // Generate the QR code data (use the booking ID or any relevant details)
//         const qrCodeData = JSON.stringify({
//             bookingId: reservaGuardada._id,
//             event: evento.name,
//             user: reservaPoblada.user_id.username,
//             date: bookingDate,
//             totalPrice,
//         });

//         // Generate QR code as Base64
//         const qrCodeBase64 = await QRCode.toDataURL(qrCodeData);

//         // Upload QR code to Cloudinary using your middleware
//         const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
//             folder: "event_bookings", // Optional: Specify folder
//             public_id: `booking_${reservaGuardada._id}`, // Optional: Unique identifier
//         });

//         // Send response with detailed information and Cloudinary QR code URL
//         res.status(200).json({
//             status: "success",
//             success: "true",
//             message: "Tu reserva ha sido realizada",
//             data: reservaPoblada,
//             qrCodeUrl: qrCodeUploadResponse.secure_url, // Cloudinary QR code URL
//         });
//     } catch (err) {
//         res.status(500).json({
//             status: "failed",
//             success: "false",
//             message: "Error al realizar la reserva",
//             error: err.message,
//         });
//     }
// };
import crypto from 'crypto';


// Encryption Helper Functions
// const encrypt = (data, secretKey) => {
//     const iv = crypto.randomBytes(16); // Initialization vector for encryption

//     const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), Buffer.from(secretKey.slice(0, 16)));
//     let encrypted = cipher.update(data, 'utf8', 'hex');
//     encrypted += cipher.final('hex');
//     return encrypted;
// };
//..........................working but without message ............................
// const encrypt = (data, secretKey) => {
//     const keyBuffer = Buffer.from(secretKey, 'hex'); // Convert hex to raw binary
//     const iv = crypto.randomBytes(16); // Initialization Vector (16 bytes)
//     const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
//     let encrypted = cipher.update(data, 'utf8', 'hex');
//     encrypted += cipher.final('hex');
//     return `${iv.toString('hex')}:${encrypted}`; // Include IV in the output
// };
// // const encrypt = (data, secretKey) => {
// //     const iv = crypto.randomBytes(16); // Initialization vector for encryption
// //     const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'utf-8'), iv);
// //     let encrypted = cipher.update(data, 'utf8', 'hex');
// //     encrypted += cipher.final('hex');
// //     return `${iv.toString('hex')}:${encrypted}`; // Include IV with encrypted data
// // }
// const decrypt = (encryptedData, secretKey) => {
//     const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), Buffer.from(secretKey.slice(0, 16)));
//     let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
//     decrypted += decipher.final('utf8');
//     return decrypted;
// };

// export const createBooking = async (req, res) => {
//     const { bookingDate, event_id, user_id, guestSize, seatNumbers, totalPrice } = req.body;

//     try {
//         const evento = await Event.findById(event_id);
//         if (!evento) {
//             return res.status(404).json({
//                 status: "failed",
//                 success: "false",
//                 message: "Evento no encontrado",
//             });
//         }

//         // const existingBooking = await Booking.findOne({ event_id });
//         // if (existingBooking) {
//         //     return res.status(400).json({
//         //         status: "failed",
//         //         success: "false",
//         //         message: "Ya has reservado para este evento en esta fecha",
//         //     });
//         // }

//         const conflictingSeats = await Booking.find({
//             event_id,
//             bookingDate,
//             seatNumbers: { $in: seatNumbers },
//         });

//         if (conflictingSeats.length > 0) {
//             return res.status(400).json({
//                 status: "failed",
//                 success: "false",
//                 message: "Algunos de los asientos seleccionados ya están reservados",
//                 conflictingSeats: conflictingSeats.map(booking => booking.seatNumbers).flat(),
//             });
//         }

//         const nuevaReserva = new Booking({
//             user_id,
//             event_id,
//             bookingDate,
//             guestSize,
//             seatNumbers,
//             totalPrice,
//         });

//         const reservaGuardada = await nuevaReserva.save();

//         evento.availableSeats = evento.availableSeats.filter(seat => !seatNumbers.includes(seat));
//         const eventoActualizado = await evento.save();

//         const reservaPoblada = await Booking.findById(reservaGuardada._id)
//             .populate('user_id', 'username email')
//             .populate('event_id', 'name desc venue');

//         // Generate encrypted QR code data
//         const secretKey = process.env.QR_SECRET_KEY; // Ensure this is a securely stored environment variable
//         const qrCodeData = JSON.stringify({
//             bookingId: reservaGuardada._id,
//             event: evento.name,
//             user: reservaPoblada.user_id.username,
//             date: bookingDate,
//             totalPrice,
//         });

//         const encryptedData = encrypt(qrCodeData, secretKey);

//         const qrCodeBase64 = await QRCode.toDataURL(encryptedData);

//         const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
//             folder: "event_bookings",
//             public_id: `booking_${reservaGuardada._id}`,
//         });

//         res.status(200).json({
//             status: "success",
//             success: "true",
//             message: "Tu reserva ha sido realizada",
//             data: reservaPoblada,
//             qrCodeUrl: qrCodeUploadResponse.secure_url,
//         });
//     } catch (err) {
//         res.status(500).json({
//             status: "failed",
//             success: "false",
//             message: "Error al realizar la reserva",
//             error: err.message,
//         });
//     }
// };
// Encryption helper function
const encrypt = (data, secretKey) => {
    const keyBuffer = Buffer.from(secretKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

// Booking creation function
export const createBooking = async (req, res) => {
    const { bookingDate, event_id, user_id, guestSize, seatNumbers, totalPrice } = req.body;

    try {
        // Fetch event details
        const evento = await Event.findById(event_id);
        if (!evento) {
            return res.status(404).json({
                status: "failed",
                success: "false",
                message: "Evento no encontrado",
            });
        }

        // Check for conflicting seats
        const conflictingSeats = await Booking.find({
            event_id,
            bookingDate,
            seatNumbers: { $in: seatNumbers },
        });

        if (conflictingSeats.length > 0) {
            return res.status(400).json({
                status: "failed",
                success: "false",
                message: "Algunos de los asientos seleccionados ya están reservados",
                conflictingSeats: conflictingSeats.map(booking => booking.seatNumbers).flat(),
            });
        }

        // Create a new booking
        const nuevaReserva = new Booking({
            user_id,
            event_id,
            bookingDate,
            guestSize,
            seatNumbers,
            totalPrice,
        });

        const reservaGuardada = await nuevaReserva.save();

        // Update available seats
        evento.availableSeats = evento.availableSeats.filter(seat => !seatNumbers.includes(seat));
        await evento.save();

        // Populate relevant details for response
        const reservaPoblada = await Booking.findById(reservaGuardada._id)
            .populate('user_id', 'username email')
            .populate('event_id', 'name desc venue');

        // Generate encrypted QR code data
        const secretKey = process.env.QR_SECRET_KEY;
        const qrCodeData = JSON.stringify({
            bookingId: reservaGuardada._id,
            event: evento.name,
            user: reservaPoblada.user_id.username,
            date: bookingDate,
            totalPrice,
        });

        const encryptedData = encrypt(qrCodeData, secretKey);

        // Create a QR code payload with a custom message
        const qrCodePayload = {
            errorMessage: "Invalid QR Code. Please contact the event organizer.", // Custom message here
            data: encryptedData, // Encrypted booking details
        };

        // Generate QR code as Base64
        const qrCodeBase64 = await QRCode.toDataURL(JSON.stringify(qrCodePayload));

        // Upload QR code to Cloudinary
        const qrCodeUploadResponse = await uploadOnCloudinary(qrCodeBase64, {
            folder: "event_bookings",
            public_id: `booking_${reservaGuardada._id}`,
        });

        // Send response with booking details and QR code URL
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Tu reserva ha sido realizada",
            data: reservaPoblada,
            qrCodeUrl: qrCodeUploadResponse.secure_url,
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error al realizar la reserva",
            error: err.message,
        });
    }
};
export const getBooking = async (req, res) => {
    const _id = req.query.id;

    try {
        const reserva = await Booking.findById(_id);
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Éxito",
            data: reserva,
        });
    } catch (err) {
        res.status(404).json({
            status: "failed",
            success: "false",
            message: "Reserva no encontrada",
        });
    }
};

// 2) To get all bookings by a user
export const getUserBookings = async (req, res) => {
    const user_id = req.query.user_id;

    try {
        const reservasUsuario = await Booking.find({ user_id }).populate('event_id', 'name venue');
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Reservas del usuario recuperadas con éxito",
            data: reservasUsuario,
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error al recuperar las reservas del usuario",
            error: err.message,
        });
    }
};

// 3) To get all bookings for an event
export const getEventBookings = async (req, res) => {
    const event_id = req.query.event_id;

    try {
        const reservasEvento = await Booking.find({ event_id }).populate('user_id', 'username email');
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Reservas del evento recuperadas con éxito",
            data: reservasEvento,
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error al recuperar las reservas del evento",
            error: err.message,
        });
    }
};

// 4) To get all bookings details
export const getAllBookings = async (req, res) => {
    try {
        const todasLasReservas = await Booking.find();
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Éxito",
            count: todasLasReservas.length,
            data: todasLasReservas,
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error interno del servidor",
        });
    }
};

// 5) To delete a booking
export const deleteBooking = async (req, res) => {
    const id = req.params.id;

    try {
        await Booking.findByIdAndDelete(id);
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Reserva eliminada con éxito",
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "No se pudo eliminar la reserva. Intenta nuevamente.",
        });
    }
};

// 6) To update a booking
export const updateBooking = async (req, res) => {
    const _id = req.query.id;

    try {
        const actualizarReserva = await Booking.findByIdAndUpdate(_id, { $set: req.body }, { new: true });
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Reserva actualizada con éxito",
            data: actualizarReserva,
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "No se pudo actualizar la reserva. Intenta nuevamente.",
        });
    }
};
