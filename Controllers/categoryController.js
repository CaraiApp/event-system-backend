import Category from '../models/Category.js';
import Event from '../models/Event.js';
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Create a new category
 * @route   POST /api/v1/categories
 * @access  Private (Admin only)
 */
export const createCategory = asyncHandler(async (req, res) => {
    const { name, description, icon, color, featured } = req.body;
    let imageUrl = null;

    try {
        // Check if category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            throw new ApiError(400, 'Una categoría con este nombre ya existe');
        }

        // Process image if uploaded
        if (req.file) {
            const cloudinaryResponse = await uploadOnCloudinary(req.file.path, 'categories');
            if (cloudinaryResponse) {
                imageUrl = cloudinaryResponse.secure_url;
            } else {
                throw new ApiError(500, 'Error al subir la imagen a Cloudinary');
            }
        }

        // Create the category
        const newCategory = new Category({
            name,
            description,
            icon: icon || '🎫',
            color: color || '#3498db',
            imageUrl: imageUrl || 'https://via.placeholder.com/300x200?text=Categoría',
            featured: featured || false
        });

        const savedCategory = await newCategory.save();

        return res.status(201).json(new ApiResponse(
            201,
            savedCategory,
            'Categoría creada con éxito'
        ));
    } catch (error) {
        console.error('Error al crear categoría:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Error al crear la categoría');
    } finally {
        // Clean up the uploaded file if it exists
        if (req.file && req.file.path) {
            import('fs').then(fs => {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            });
        }
    }
});

/**
 * @desc    Get all categories
 * @route   GET /api/v1/categories
 * @access  Public
 */
export const getAllCategories = asyncHandler(async (req, res) => {
    try {
        // Find all active categories
        const categories = await Category.find({ active: true }).sort({ featured: -1, name: 1 });

        // Get event counts for each category
        const categoryIds = categories.map(category => category.id);
        const eventCounts = await Promise.all(
            categoryIds.map(async (categoryId) => {
                const count = await Event.countDocuments({ category: categoryId });
                return { categoryId, count };
            })
        );

        // Create a map for quick lookup
        const eventCountMap = eventCounts.reduce((map, item) => {
            map[item.categoryId] = item.count;
            return map;
        }, {});

        // Format the response
        const formattedCategories = categories.map(category => ({
            id: category._id,
            name: category.name,
            description: category.description,
            icon: category.icon,
            color: category.color,
            imageUrl: category.imageUrl,
            featured: category.featured,
            slug: category.slug,
            eventCount: eventCountMap[category.id] || 0
        }));

        return res.status(200).json(new ApiResponse(
            200,
            { categories: formattedCategories },
            'Categorías recuperadas con éxito'
        ));
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        throw new ApiError(500, 'Error al obtener las categorías');
    }
});

/**
 * @desc    Get category by ID
 * @route   GET /api/v1/categories/:id
 * @access  Public
 */
export const getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        // Find the category
        const category = await Category.findById(id);
        if (!category) {
            throw new ApiError(404, 'Categoría no encontrada');
        }

        // Get event count for this category
        const eventCount = await Event.countDocuments({ category: id });

        // Format response
        const formattedCategory = {
            id: category._id,
            name: category.name,
            description: category.description,
            icon: category.icon,
            color: category.color,
            imageUrl: category.imageUrl,
            featured: category.featured,
            slug: category.slug,
            active: category.active,
            eventCount
        };

        return res.status(200).json(new ApiResponse(
            200,
            formattedCategory,
            'Categoría recuperada con éxito'
        ));
    } catch (error) {
        console.error('Error al obtener categoría:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Error al obtener la categoría');
    }
});

/**
 * @desc    Update category
 * @route   PUT /api/v1/categories/:id
 * @access  Private (Admin only)
 */
export const updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, icon, color, featured, active } = req.body;
    let imageUrl = null;

    try {
        // Find the category
        const category = await Category.findById(id);
        if (!category) {
            throw new ApiError(404, 'Categoría no encontrada');
        }

        // Check if name is being updated and is already used by another category
        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ name });
            if (existingCategory && existingCategory._id.toString() !== id) {
                throw new ApiError(400, 'Ya existe una categoría con este nombre');
            }
        }

        // Process image if uploaded
        if (req.file) {
            const cloudinaryResponse = await uploadOnCloudinary(req.file.path, 'categories');
            if (cloudinaryResponse) {
                imageUrl = cloudinaryResponse.secure_url;

                // Delete the old image from Cloudinary if it exists and is not the default
                if (category.imageUrl && !category.imageUrl.includes('placeholder.com')) {
                    const publicId = category.imageUrl.split('/').pop().split('.')[0];
                    await deleteOnCloudinary(publicId, 'categories');
                }
            } else {
                throw new ApiError(500, 'Error al subir la imagen a Cloudinary');
            }
        }

        // Update the category
        category.name = name || category.name;
        category.description = description || category.description;
        category.icon = icon || category.icon;
        category.color = color || category.color;
        if (imageUrl) category.imageUrl = imageUrl;
        if (typeof featured === 'boolean') category.featured = featured;
        if (typeof active === 'boolean') category.active = active;

        const updatedCategory = await category.save();

        return res.status(200).json(new ApiResponse(
            200,
            updatedCategory,
            'Categoría actualizada con éxito'
        ));
    } catch (error) {
        console.error('Error al actualizar categoría:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Error al actualizar la categoría');
    } finally {
        // Clean up the uploaded file if it exists
        if (req.file && req.file.path) {
            import('fs').then(fs => {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            });
        }
    }
});

/**
 * @desc    Delete category
 * @route   DELETE /api/v1/categories/:id
 * @access  Private (Admin only)
 */
export const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        // Find the category
        const category = await Category.findById(id);
        if (!category) {
            throw new ApiError(404, 'Categoría no encontrada');
        }

        // Check if the category is in use
        const eventCount = await Event.countDocuments({ category: id });
        if (eventCount > 0) {
            throw new ApiError(400, 'No se puede eliminar la categoría porque está en uso por eventos');
        }

        // Delete the image from Cloudinary if it exists and is not the default
        if (category.imageUrl && !category.imageUrl.includes('placeholder.com')) {
            const publicId = category.imageUrl.split('/').pop().split('.')[0];
            await deleteOnCloudinary(publicId, 'categories');
        }

        // Delete the category
        await Category.findByIdAndDelete(id);

        return res.status(200).json(new ApiResponse(
            200,
            null,
            'Categoría eliminada con éxito'
        ));
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Error al eliminar la categoría');
    }
});

/**
 * @desc    Toggle category featured status
 * @route   PATCH /api/v1/categories/:id/featured
 * @access  Private (Admin only)
 */
export const toggleCategoryFeatured = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { featured } = req.body;

    try {
        // Find the category
        const category = await Category.findById(id);
        if (!category) {
            throw new ApiError(404, 'Categoría no encontrada');
        }

        // Update the featured status
        category.featured = featured;
        const updatedCategory = await category.save();

        return res.status(200).json(new ApiResponse(
            200,
            updatedCategory,
            `Categoría ${featured ? 'marcada como destacada' : 'desmarcada como destacada'} con éxito`
        ));
    } catch (error) {
        console.error('Error al actualizar estado destacado:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Error al actualizar estado destacado de la categoría');
    }
});

/**
 * @desc    Toggle category active status
 * @route   PATCH /api/v1/categories/:id/active
 * @access  Private (Admin only)
 */
export const toggleCategoryActive = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;

    try {
        // Find the category
        const category = await Category.findById(id);
        if (!category) {
            throw new ApiError(404, 'Categoría no encontrada');
        }

        // Update the active status
        category.active = active;
        const updatedCategory = await category.save();

        return res.status(200).json(new ApiResponse(
            200,
            updatedCategory,
            `Categoría ${active ? 'activada' : 'desactivada'} con éxito`
        ));
    } catch (error) {
        console.error('Error al actualizar estado activo:', error);
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, 'Error al actualizar estado activo de la categoría');
    }
});

// No default export needed as we're using named exports