import express  from "express";
import { verifyAdmin,verifyJWT } from "../utils/verifyToken.js";

import { createNewEvent,getEventsByTimeAndName, publishEvent,deleteEvent, getAllEvents, getFeaturedEvents, getWalkInEvents, getSingleEvent, getEventsBySearch, getEventsCount, updateEvent, getUserEvents, featureEvent } from "../Controllers/eventController.js";
 //import { upload } from '../MiddleWares/multer.middleware.js';
 import multer  from 'multer';
 const upload = multer({ dest: 'uploads/' });
const router = express.Router()              
//router.post('/createEvent',  createNewEvent)
//router.post('/createEvent', upload.single('photo'),verifyJWT, createNewEvent);
router.post('/createEvent', upload.any(), verifyJWT, createNewEvent);

router.put('/updateEvent',upload.any(),  updateEvent)
router.patch('/publishedEvent',  publishEvent)
router.patch('/featuredEvent',  featureEvent)
router.delete('/publishedEvent',  deleteEvent)
router.get('/getsingleEvent', getSingleEvent)
router.get('/getuserEvent',verifyJWT, getUserEvents)
router.get('/walk-in', getWalkInEvents);
router.get('/getAllEvents', getAllEvents)
router.get('/search/getEventBySearch', getEventsBySearch)
router.get('/search/getFeaturedEvents', getFeaturedEvents)
router.get('/search/getEventCount', getEventsCount)
router.get('/search/getEventbytime',getEventsByTimeAndName )

export default router
