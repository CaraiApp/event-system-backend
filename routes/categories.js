import express from "express";
import { verifyAdmin, verifyJWT } from "../utils/verifyToken.js";
import { 
    createCategory, 
    getAllCategories, 
    getCategoryById, 
    updateCategory, 
    deleteCategory,
    toggleCategoryFeatured,
    toggleCategoryActive
} from "../Controllers/categoryController.js";
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Admin only routes
router.post('/', verifyJWT, verifyAdmin, upload.single('image'), createCategory);
router.put('/:id', verifyJWT, verifyAdmin, upload.single('image'), updateCategory);
router.delete('/:id', verifyJWT, verifyAdmin, deleteCategory);
router.patch('/:id/featured', verifyJWT, verifyAdmin, toggleCategoryFeatured);
router.patch('/:id/active', verifyJWT, verifyAdmin, toggleCategoryActive);

export default router;