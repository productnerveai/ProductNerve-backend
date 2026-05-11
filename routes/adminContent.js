const express = require('express');
const router = express.Router();
const {
  getAllBlogPosts,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  publishBlogPost,
  getAllPages,
  createPage,
  updatePage,
  deletePage,
  getStudioContent,
  deleteStudioContent
} = require('../controllers/adminContentController');
const { protect } = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/adminAuth');

// All content management routes require authentication and admin access
router.use(protect);
router.use(requireAdmin);
router.use(requirePermission('can_manage_content'));

/**
 * Blog Post Management
 */

// Get all blog posts
router.get('/content/blog-posts', getAllBlogPosts);

// Get specific blog post
router.get('/content/blog-posts/:id', getBlogPostById);

// Create new blog post
router.post('/content/blog-posts', createBlogPost);

// Update blog post
router.put('/content/blog-posts/:id', updateBlogPost);

// Publish blog post
router.put('/content/blog-posts/:id/publish', publishBlogPost);

// Delete blog post
router.delete('/content/blog-posts/:id', deleteBlogPost);

/**
 * Content Page Management
 */

// Get all content pages
router.get('/content/pages', getAllPages);

// Create new content page
router.post('/content/pages', createPage);

// Update content page
router.put('/content/pages/:id', updatePage);

// Delete content page
router.delete('/content/pages/:id', deletePage);

/**
 * Studio Content Management
 */

// Get all studio content
router.get('/studio/content', getStudioContent);

// Delete studio content
router.delete('/studio/:toolType/:id', deleteStudioContent);

module.exports = router;
