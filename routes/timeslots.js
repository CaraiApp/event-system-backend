import express  from "express";
import { verifyAdmin } from "../utils/verifyToken.js";
import { createTimeslot, deleteTimeslot, 
         getAllSlots, getSlotById, updateTimeslot } from "../Controllers/timeSlotController.js";

const router = express.Router()   

router.post('/createTimeslot',  createTimeslot)
router.get('/getAllSlots', getAllSlots)        
router.put('/updateslot', updateTimeslot)
router.get('/getslot', getSlotById)
router.delete('/deletetimeslot', deleteTimeslot)   

export default router
