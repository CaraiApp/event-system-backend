import Event from '../models/Event.js';
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import fs from 'fs';
// export const createNewEvent = async (req, res) => {
//     const {
//         name,
//         venue,
//         address,
//         template,
//         desc,
//         vipprice,
//         economyprice,
//         vipSize,
//         economySize,
//         eventDate,
//         eventTime,
//         eventDateSec,
//         eventTimeSec,
//         currency,
//         ticket,
//         category,
//         featured,
//         published
//     } = req.body;

//     if (!req.user || !req.user._id) {
//         return res.status(401).json({
//             status: 'fallido',
//             success: 'falso',
//             message: 'No autorizado: Usuario, inicie sesión y vuelva a intentarlo.'
//         });
//     }

//     let user_id = req.user._id;

//     let photo = null;
//     let galleryFiles = [];
//     let photoUrl = null;
//     let galleryUrls = [];
//     for (const file of req.files) {
//         if (file.fieldname === 'photo') {
//             photo = file.path; 
//         } else if (file.fieldname.startsWith('gallery')) {
//             galleryFiles.push(file.path);
//         }
//     }

//     try {
//         if (photo) {
//             const cloudinaryResponse = await uploadOnCloudinary(photo, 'eventos');
//             if (cloudinaryResponse) {
//                 photoUrl = cloudinaryResponse.secure_url;
//             } else {
//                 return res.status(500).json({
//                     status: 'fallido',
//                     success: 'falso',
//                     message: 'Error al subir la foto a Cloudinary. Evento no creado.',
//                 });
//             }
//         }

//         for (const galleryFile of galleryFiles) {
//             const cloudinaryResponse = await uploadOnCloudinary(galleryFile, 'eventos');
//             if (cloudinaryResponse) {
//                 galleryUrls.push(cloudinaryResponse.secure_url);
//             } else {
//                 console.warn(`Error al subir la imagen: ${galleryFile}`);
//             }
//         }

//         const TotalCapacity = Number(vipSize) + Number(economySize);

//         const newEvent = new Event({
//             name,
//             venue,
//             address,
//             desc,
//             vipprice,
//             economyprice,
//             vipSize,
//             economySize,
//             template,
//             eventDate: new Date(eventDate),
//             eventTime: new Date(eventTime),
//             user_id,
//             TotalCapacity,
//             currency,
//             ticket,
//             category,
//             photo: photoUrl,
//             gallery: galleryUrls,
//             featured: featured || false,
//             published: published || false,
//         });

//         const savedEvent = await newEvent.save();

//         res.status(201).json({
//             status: 'éxito',
//             success: 'verdadero',
//             message: 'Evento creado exitosamente',
//             data: savedEvent,
//         });

//     } catch (err) {
//         console.error('Error al crear el evento:', err);
//         res.status(500).json({
//             status: 'fallido',
//             success: 'falso',
//             message: 'No se pudo crear el evento. Intente nuevamente.',
//             error: err.message,
//         });
//     } finally {
//         if (photo) {
//             import('fs').then(fs => {
//                 if (fs.existsSync(photo)) {
//                     fs.unlinkSync(photo);
//                 }
//             });
//         }

//         for (const galleryFile of galleryFiles) {
//             import('fs').then(fs => {
//                 if (fs.existsSync(galleryFile)) {
//                     fs.unlinkSync(galleryFile);
//                 }
//             });
//         }
//     }
// };
export const createNewEvent = async (req, res) => {
    const {
        name,
        venue,
        address,
        template,
        desc,
        vipprice,
        economyprice,
        vipSize,
        economySize,
        eventDate,
        eventTime,
        eventDateSec,
        eventTimeSec,
        finalSeats,
        currency,
        ticket,
        category,
        featured,
        published
    } = req.body;

    // Check if the user is authorized
    if (!req.user || !req.user._id) {
        return res.status(401).json({
            status: 'fallido',
            success: 'falso',
            message: 'No autorizado: Usuario, inicie sesión y vuelva a intentarlo.'
        });
    }

    let user_id = req.user._id;

    let photo = null;
    let galleryFiles = [];
    let photoUrl = null;
    let galleryUrls = [];

    // Process uploaded files
    for (const file of req.files) {
        if (file.fieldname === 'photo') {
            photo = file.path;
        } else if (file.fieldname.startsWith('gallery')) {
            galleryFiles.push(file.path);
        }
    }

    try {
        // Upload photo to Cloudinary
        if (photo) {
            const cloudinaryResponse = await uploadOnCloudinary(photo, 'eventos');
            if (cloudinaryResponse) {
                photoUrl = cloudinaryResponse.secure_url;
            } else {
                return res.status(500).json({
                    status: 'fallido',
                    success: 'falso',
                    message: 'Error al subir la foto a Cloudinary. Evento no creado.',
                });
            }
        }

        // Upload gallery images to Cloudinary
        for (const galleryFile of galleryFiles) {
            const cloudinaryResponse = await uploadOnCloudinary(galleryFile, 'eventos');
            if (cloudinaryResponse) {
                galleryUrls.push(cloudinaryResponse.secure_url);
            } else {
                console.warn(`Error al subir la imagen: ${galleryFile}`);
            }
        }

        // Calculate total capacity
        const TotalCapacity = Number(vipSize) + Number(economySize);

        // Create new event with support for eventDateSec and eventTimeSec
        const newEvent = new Event({
            name,
            venue,
            address,
            desc,
            vipprice,
            economyprice,
            vipSize,
            economySize,
            template,
            finalSeats,
            eventDate: eventDate ? new Date(eventDate) : null,
            eventTime: eventTime ? new Date(eventTime) : null,
            eventDateSec: eventDateSec ? new Date(eventDateSec) : null,
            eventTimeSec: eventTimeSec ? new Date(eventTimeSec) : null,
            user_id,
            TotalCapacity,
            currency,
            ticket,
            category,
            photo: photoUrl,
            gallery: galleryUrls,
            featured: featured || false,
            published: published || false,
        });

        // Save the event to the database
        const savedEvent = await newEvent.save();

        res.status(201).json({
            status: 'éxito',
            success: 'verdadero',
            message: 'Evento creado exitosamente',
            data: savedEvent,
        });

    } catch (err) {
        console.error('Error al crear el evento:', err);
        res.status(500).json({
            status: 'fallido',
            success: 'falso',
            message: 'No se pudo crear el evento. Intente nuevamente.',
            error: err.message,
        });
    } finally {
        // Clean up local files
        if (photo) {
            import('fs').then(fs => {
                if (fs.existsSync(photo)) {
                    fs.unlinkSync(photo);
                }
            });
        }

        for (const galleryFile of galleryFiles) {
            import('fs').then(fs => {
                if (fs.existsSync(galleryFile)) {
                    fs.unlinkSync(galleryFile);
                }
            });
        }
    }
};

export const updateEvent = async (req, res) => {
    const id = req.query.id;

    let photo = null;
    let galleryFiles = [];
    let photoUrl = null;
    let galleryUrls = [];
    let galeriesToDelete = [];

    // Process uploaded files if any
    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            if (file.fieldname === 'photo') {
                photo = file.path;
            } else if (file.fieldname.startsWith('gallery')) {
                galleryFiles.push(file.path);
            }
        }
    }

    // Process gallery items to delete if specified
    if (req.body.deleteGalleryItems && Array.isArray(JSON.parse(req.body.deleteGalleryItems))) {
        galeriesToDelete = JSON.parse(req.body.deleteGalleryItems);
    }

    try {
        // Find the existing event
        const existingEvent = await Event.findById({ _id: id });
        if (!existingEvent) {
            return res.status(404).json({
                status: "fallido",
                success: "falso",
                message: "Evento no encontrado",
            });
        }

        // Process main photo upload if provided
        if (photo) {
            const cloudinaryResponse = await uploadOnCloudinary(photo, 'eventos');
            if (cloudinaryResponse) {
                photoUrl = cloudinaryResponse.secure_url;
                
                // Delete old photo from Cloudinary if it exists
                if (existingEvent.photo) {
                    try {
                        const publicId = existingEvent.photo.split('/').pop().split('.')[0];
                        await deleteOnCloudinary(publicId, 'eventos');
                    } catch (deleteError) {
                        console.warn(`Error al eliminar la foto antigua: ${deleteError.message}`);
                    }
                }
            } else {
                return res.status(500).json({
                    status: "fallido",
                    success: "falso",
                    message: "Error al subir la foto a Cloudinary. Evento no actualizado.",
                });
            }
        }

        // Process gallery images upload if provided
        for (const galleryFile of galleryFiles) {
            const cloudinaryResponse = await uploadOnCloudinary(galleryFile, 'eventos');
            if (cloudinaryResponse) {
                galleryUrls.push(cloudinaryResponse.secure_url);
            } else {
                console.warn(`Error al subir la imagen: ${galleryFile}`);
            }
        }

        // Prepare updated data
        const updatedData = { ...req.body };

        // Remove fields that should be processed separately
        delete updatedData.deleteGalleryItems;

        // Update the main photo if a new one was uploaded
        if (photoUrl) {
            updatedData.photo = photoUrl;
        }

        // Update gallery
        if (galleryUrls.length > 0 || galeriesToDelete.length > 0) {
            // Start with existing gallery
            let updatedGallery = existingEvent.gallery || [];
            
            // Remove items marked for deletion
            if (galeriesToDelete.length > 0) {
                // Try to delete from Cloudinary
                for (const imageUrl of galeriesToDelete) {
                    try {
                        const publicId = imageUrl.split('/').pop().split('.')[0];
                        await deleteOnCloudinary(publicId, 'eventos');
                    } catch (deleteError) {
                        console.warn(`Error al eliminar imagen de la galería: ${deleteError.message}`);
                    }
                }
                
                // Filter out deleted items
                updatedGallery = updatedGallery.filter(url => !galeriesToDelete.includes(url));
            }
            
            // Add new items
            if (galleryUrls.length > 0) {
                updatedGallery = [...updatedGallery, ...galleryUrls];
            }
            
            updatedData.gallery = updatedGallery;
        }

        // Update the event
        const updatedEvent = await Event.findByIdAndUpdate(id, { $set: updatedData }, { new: true });

        res.status(200).json({
            status: "éxito",
            success: "verdadero",
            message: "Evento actualizado exitosamente",
            data: updatedEvent,
        });

    } catch (err) {
        console.error('Error al actualizar el evento:', err);

        res.status(500).json({
            status: "fallido",
            success: "falso",
            message: "No se pudo actualizar el evento. Intente nuevamente.",
            error: err.message
        });
    } finally {
        // Clean up local files
        if (photo) {
            import('fs').then(fs => {
                if (fs.existsSync(photo)) {
                    fs.unlinkSync(photo);
                }
            });
        }

        for (const galleryFile of galleryFiles) {
            import('fs').then(fs => {
                if (fs.existsSync(galleryFile)) {
                    fs.unlinkSync(galleryFile);
                }
            });
        }
    }
};

// Remaining methods can follow similar patterns, adjusting for changes in the Korean model schema where necessary.

// export const updateEvent = async (req, res) => {
//     const id = req.query.id;

//     // Initialize variables for photo and gallery updates
//     let photo = null;
//     let galleryFiles = [];
//     let photoUrl = null;
//     let galleryUrls = [];

//     // Process uploaded files
//     for (const file of req.files) {
//         if (file.fieldname === 'photo') {
//             photo = file.path; // Main photo
//         } else if (file.fieldname.startsWith('gallery')) {
//             galleryFiles.push(file.path); // Gallery images
//         }
//     }

//     try {
//         // Step 1: Find the existing event
//         const existingEvent = await Event.findById({ _id: id });
//         if (!existingEvent) {
//             return res.status(404).json({
//                 status: "failed",
//                 success: "false",
//                 message: "Event not found",
//             });
//         }

//         // Step 2: Handle new photo upload
//         if (photo) {
//             // Upload the new photo to Cloudinary
//             const cloudinaryResponse = await uploadOnCloudinary(photo, 'events');
//             if (cloudinaryResponse) {
//                 photoUrl = cloudinaryResponse.secure_url; // New photo URL
//             } else {
//                 return res.status(500).json({
//                     status: "failed",
//                     success: "false",
//                     message: "Photo upload to Cloudinary failed. Event not updated.",
//                 });
//             }
//         }

//         // Step 3: Handle new gallery images upload
//         for (const galleryFile of galleryFiles) {
//             const cloudinaryResponse = await uploadOnCloudinary(galleryFile, 'events');
//             if (cloudinaryResponse) {
//                 galleryUrls.push(cloudinaryResponse.secure_url);
//             } else {
//                 console.warn(`Failed to upload image: ${galleryFile}`);
//             }
//         }

//         // Step 4: Prepare updated data
//         const updatedData = {
//             ...req.body,
//         };

//         // Include new photo URL if available
//         if (photoUrl) {
//             updatedData.photo = photoUrl;
//         }

//         // Include new gallery URLs if available
//         if (galleryUrls.length > 0) {
//             updatedData.gallery = [...(existingEvent.gallery || []), ...galleryUrls];
//         }

//         // Step 5: Update the event in the database
//         const updatedEvent = await Event.findByIdAndUpdate(id, { $set: updatedData }, { new: true });

//         res.status(200).json({
//             status: "success",
//             success: "true",
//             message: "Event successfully updated",
//             data: updatedEvent,
//         });

//     } catch (err) {
//         console.error('Error updating event:', err);

//         res.status(500).json({
//             status: "failed",
//             success: "false",
//             message: "Event cannot be updated. Try again.",
//         });
//     } finally {
//         // Step 6: Clean up the locally uploaded files
//         if (photo) {
//             import('fs').then(fs => {
//                 if (fs.existsSync(photo)) {
//                     fs.unlinkSync(photo); // Delete the main photo locally
//                 }
//             });
//         }

//         for (const galleryFile of galleryFiles) {
//             import('fs').then(fs => {
//                 if (fs.existsSync(galleryFile)) {
//                     fs.unlinkSync(galleryFile); // Delete the gallery file locally
//                 }
//             });
//         }
//     }
// };
export const getSingleEvent = async (req, res) => {
    const _id = req.query.id;

    try {
        // Obtener el evento y completar los detalles del propietario
        const singleEvent = await Event.findById(_id).populate('user_id', 'username email photo');

        if (!singleEvent) {
            return res.status(404).json({
                status: "fallido",
                success: "falso",
                message: "Error: Datos del evento no encontrados.",
            });
        }

        // Transformar la respuesta para incluir 'owner' en lugar de 'user_id'
        const { user_id, ...eventData } = singleEvent.toObject();
        const transformedEvent = {
            ...eventData,
            owner: {
                username: user_id.username,
                email: user_id.email,
                photo: user_id.photo,
            },
        };

        res.status(200).json({
            status: "éxito",
            success: "verdadero",
            message: "Exitoso",
            data: transformedEvent,
        });
    } catch (err) {
        console.error('Error al obtener el evento:', err.message);
        res.status(500).json({
            status: "fallido",
            success: "falso",
            message: "Error interno del servidor.",
        });
    }
};

export const getAllEvents = async (req, res) => {
    const page = parseInt(req.query.page) || 0;

    try {
        // Obtener eventos con paginación y completar detalles del propietario
        const allEvents = await Event.find({})
            .populate('user_id', 'username email photo')
            .skip(page * 8)
            .limit(8);

        // Transformar la respuesta para incluir 'owner' en lugar de 'user_id'
        const transformedEvents = allEvents.map(event => {
            const { user_id, ...eventData } = event.toObject();
            return {
                ...eventData,
                owner: {
                    username: user_id.username,
                    email: user_id.email,
                    photo: user_id.photo,
                },
            };
        });

        res.status(200).json({
            status: "éxito",
            success: "verdadero",
            count: transformedEvents.length,
            message: "Exitoso",
            data: transformedEvents,
        });
    } catch (err) {
        console.error('Error al obtener todos los eventos:', err.message);
        res.status(500).json({
            status: "fallido",
            success: "falso",
            message: "Error interno del servidor.",
        });
    }
};

//3) PARA ELIMINAR UN EVENTO
export const deleteEvent = async (req, res) => {
    const id = req.params.id;

    try {
        await Event.findByIdAndDelete(id);
        res.status(200).json({
            status: "éxito",
            success: "verdadero",
            message: "Evento eliminado exitosamente",
        });
    } catch (err) {
        res.status(500).json({
            status: "fallido",
            success: "falso",
            message: "El evento no puede ser eliminado. Intente nuevamente.",
        });
    }
};


// export const getSingleEvent = async (req, res) => {
//     const _id = req.query.id;

//     try {
//         // Fetch the event and populate the owner details
//         const singleEvent = await Event.findById(_id).populate('user_id', 'username email photo'); // Replace 'username email' with the fields you want to include.

//         if (!singleEvent) {
//             return res.status(404).json({
//                 status: "failed",
//                 success: "false",
//                 message: "Error: Event Data Not Found.",
//             });
//         }

//         // Transform the response to include 'owner' instead of 'user_id'
//         const { user_id, ...eventData } = singleEvent.toObject(); // Convert Mongoose document to plain object
//         const transformedEvent = {
//             ...eventData,
//             owner: user_id, // Rename user_id to owner
//         };

//         res.status(200).json({
//             status: "success",
//             success: "true",
//             message: "Successful",
//             data: transformedEvent,
//         });
//     } catch (err) {
//         console.error('Error fetching event:', err.message);
//         res.status(500).json({
//             status: "failed",
//             success: "false",
//             message: "Internal Server Error.",
//         });
//     }
// };


// export const getAllEvents = async (req, res) => {
//     // Parse page number from query or default to 0
//     const page = parseInt(req.query.page) || 0;

//     try {
//         // Fetch events with pagination and populate owner details
//         const allEvents = await Event.find({})
//             .populate('user_id', 'username email') // Populate owner details
//             .skip(page * 8)
//             .limit(8);

//         // Transform the response to include 'owner' instead of 'user_id'
//         const transformedEvents = allEvents.map(event => {
//             const { user_id, ...eventData } = event.toObject(); // Convert Mongoose document to plain object
//             return {
//                 ...eventData,
//                 owner: user_id, // Rename user_id to owner
//             };
//         });

//         res.status(200).json({
//             status: "success",
//             success: "true",
//             count: transformedEvents.length,
//             message: "Successful",
//             data: transformedEvents,
//         });
//     } catch (err) {
//         console.error('Error fetching all events:', err.message);
//         res.status(500).json({
//             status: "failed",
//             success: "false",
//             message: "Internal Server Error.",
//         });
//     }
// };



// 1) To get events by search
export const getEventsBySearch = async (req, res) => {
    try {
        // Construir dinámicamente el objeto de consulta
        const query = {};

        if (req.query.name) {
            query.name = { $regex: new RegExp(req.query.name, 'i') }; // Regex insensible a mayúsculas para el nombre
        }
        if (req.query.area) {
            query.address = { $regex: req.query.area, $options: 'i' }; // Regex insensible a mayúsculas para la dirección
        }
        if (req.query.maxGuestSize) {
            const maxGuestSize = parseInt(req.query.maxGuestSize);
            if (!isNaN(maxGuestSize)) {
                query.maxGuestSize = { $gte: maxGuestSize }; // Mayor o igual que maxGuestSize
            }
        }

        console.log("Consulta de búsqueda:", query);

        // Realizar la búsqueda según la consulta construida
        const Eventos = await Event.find(query);

        res.status(200).json({
            status: "success",
            success: "true",
            message: "Éxito",
            data: Eventos,
            count: Eventos.length,
        });
    } catch (err) {
        console.error("Error al obtener eventos:", err);
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error: No se pudieron obtener los eventos.",
        });
    }
};

// 2) To get only featured events
export const getFeaturedEvents = async (req, res) => {
    try {
        // Buscar eventos destacados
        const EventosDestacados = await Event.find({ featured: true }).limit(8);
        res.status(200).json({
            status: "success",
            success: "true",
            count: EventosDestacados.length,
            message: "Éxito",
            data: EventosDestacados,
        });
    } catch (err) {
        res.status(404).json({
            status: "failed",
            success: "false",
            message: "Error: Datos no encontrados.",
        });
    }
};

// 3) To get events count
export const getEventsCount = async (req, res) => {
    try {
        // Obtener el número total de eventos
        const ContadorEventos = await Event.estimatedDocumentCount();
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Éxito",
            data: ContadorEventos,
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error: Fallo al obtener los datos.",
        });
    }
};

// 4) To publish event
export const publishEvent = async (req, res) => {
    const { eventId } = req.body; // El administrador proporciona el ID del evento para publicarlo
    try {
        // Verificar si el evento existe
        const evento = await Event.findById(eventId);
        if (!evento) {
            return res.status(404).json({
                status: "failed",
                success: "false",
                message: "Evento no encontrado",
            });
        }

        // Actualizar el evento para marcarlo como publicado
        evento.published = true; // Marcar como publicado
        await evento.save();

        res.status(200).json({
            status: "success",
            success: "true",
            message: "Evento publicado con éxito",
            data: evento,
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error al publicar el evento",
            error: err.message,
        });
    }
};

export const featureEvent = async (req, res) => {
    const { eventId } = req.body; // Admin provides the event ID to mark as featured

    try {
        // Check if the event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                status: "failed",
                success: "false",
                message: "Event not found",
            });
        }

        // Update the event to mark it as featured
        event.featured = true;
        await event.save();

        res.status(200).json({
            status: "success",
            success: "true",
            message: "Event marked as featured successfully",
            data: event,
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Failed to mark event as featured",
            error: err.message,
        });
    }
};

export const getEventsByTimeAndName = async (req, res) => {
    const { name, startTime } = req.query; // Accept name and startTime as query parameters
    const query = {};
    let startDate, endDate;

    // Handle "name" query (if provided)
    if (name) {
        query.name = new RegExp(name, 'i'); // Case-insensitive search for name
    }

    // Handle "startTime" query (if provided)
    if (startTime) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        switch (startTime.toLowerCase()) {
            case "today":
                startDate = new Date(today);
                endDate = new Date(today);
                endDate.setDate(today.getDate() + 1); // Next day
                break;
            case "this week":
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay()); // Start of the week (Sunday)
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 7); // End of the week
                break;
            case "this month":
                startDate = new Date(today);
                startDate.setDate(1); // Start of the month
                endDate = new Date(startDate);
                endDate.setMonth(startDate.getMonth() + 1); // Start of next month
                break;
            default:
                return res.status(400).json({
                    status: "failed",
                    success: "false",
                    message: "Invalid startTime value. Use 'today', 'this week', or 'this month'."
                });
        }

        // Add time range to the query
        query.eventDate = { $gte: startDate, $lt: endDate };
    }
console.log(query,"query");
    try {
        const Events = await Event.find(query); // Fetch events matching the query
        res.status(200).json({
            status: "success",
            success: "true",
            message: "Events fetched successfully",
            data: Events
        });
    } catch (err) {
        res.status(500).json({
            status: "failed",
            success: "false",
            message: "Error: Unable to fetch events. Please try again later.",
            error: err.message
        });
    }
};





// 1) To get events created by a user
export const getUserEvents = async (req, res) => {
    try {
        // Obtener el ID del usuario de la solicitud autenticada
        const userId = req.user._id;

        // Consultar la base de datos para obtener todos los eventos creados por este usuario
        const eventosUsuario = await Event.find({ user_id: userId });

        // Verificar si el usuario ha creado algún evento
        if (!eventosUsuario.length) {
            return res.status(404).json({
                status: 'failed',
                success: 'false',
                message: 'No se encontraron eventos para este usuario.',
            });
        }

        // Responder con la lista de eventos
        res.status(200).json({
            status: 'success',
            success: 'true',
            message: 'Eventos recuperados con éxito.',
            data: eventosUsuario,
        });
    } catch (err) {
        console.error('Error al obtener los eventos del usuario:', err);

        res.status(500).json({
            status: 'failed',
            success: 'false',
            message: 'Error al obtener los eventos. Intente nuevamente.',
            error: err.message,
        });
    }
};

// 2) To get walk-in events
export const getWalkInEvents = async (req, res) => {
    try {
        // Consultar la base de datos para obtener eventos con tipo de entrada "Walk-in"
        const eventosWalkIn = await Event.find({ ticket: "Walk-in" });

        // Verificar si existen eventos "Walk-in"
        if (!eventosWalkIn.length) {
            return res.status(404).json({
                status: 'failed',
                success: 'false',
                message: 'No se encontraron eventos Walk-in.',
            });
        }

        // Responder con la lista de eventos "Walk-in"
        res.status(200).json({
            status: 'success',
            success: 'true',
            message: 'Eventos Walk-in recuperados con éxito.',
            data: eventosWalkIn,
        });
    } catch (err) {
        console.error('Error al obtener los eventos Walk-in:', err);

        res.status(500).json({
            status: 'failed',
            success: 'false',
            message: 'Error al obtener los eventos Walk-in. Intente nuevamente.',
            error: err.message,
        });
    }
};
