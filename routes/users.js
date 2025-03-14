import express  from "express";
import { verifyAdmin ,verifyJWT} from "../utils/verifyToken.js";
import { createNewUser, deleteUser, getAllUsers, 
         getSingleUser, updateUser,loginUser ,} from "../Controllers/userController.js";
         import { upload } from '../MiddleWares/multer.middleware.js';
const router = express.Router()              
router.post('/loginUser',loginUser )
router.post('/createUser',upload.single('photo'), createNewUser)
router.put('/updateUser',upload.single('photo'), updateUser)
router.delete('/deleteUser', deleteUser)
router.get('/getUser', verifyJWT, getSingleUser)
router.get('/getSingleUser', verifyJWT, getSingleUser)
router.get('/getAllUsers', getAllUsers)

export default router
