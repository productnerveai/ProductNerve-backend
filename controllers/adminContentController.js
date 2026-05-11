const BlogPost = require('../models/BlogPost');
const ContentPage = require('../models/ContentPage');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get all blog posts
 * @route   GET /api/admin/content/blog-posts
 * @access  Admin (can_manage_content)
 */
exports.getAllBlogPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 25;
  const status = req.query.status || '';
  const search = req.query.search || '';
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  // Build query
  const query = {};
  
  if (status === 'published') {
    query.is_published = true;
  } else if (status === 'draft') {
    query.is_published = false;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  // Get total count
  const total = await BlogPost.countDocuments(query);

  // Get blog posts with creator data
  const blogPosts = await BlogPost.find(query)
    .populate('created_by', 'first_name last_name email')
    .populate('updated_by', 'first_name last_name email')
    .sort({ [sortBy]: sortOrder })
    .skip(page * limit)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: {
      blog_posts: blogPosts.map(post => ({
        id: post._id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        meta_title: post.meta_title,
        meta_description: post.meta_description,
        tags: post.tags,
        cover_image_url: post.cover_image_url,
        is_published: post.is_published,
        published_at: post.published_at,
        created_by: post.created_by,
        updated_by: post.updated_by,
        view_count: post.view_count,
        like_count: post.like_count,
        created_at: post.createdAt,
        updated_at: post.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Get specific blog post
 * @route   GET /api/admin/content/blog-posts/:id
 * @access  Admin (can_manage_content)
 */
exports.getBlogPostById = asyncHandler(async (req, res) => {
  const blogPost = await BlogPost.findById(req.params.id)
    .populate('created_by', 'first_name last_name email')
    .populate('updated_by', 'first_name last_name email');

  if (!blogPost) {
    return res.status(404).json({
      success: false,
      error: 'Blog post not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: blogPost._id,
      title: blogPost.title,
      slug: blogPost.slug,
      excerpt: blogPost.excerpt,
      content: blogPost.content,
      meta_title: blogPost.meta_title,
      meta_description: blogPost.meta_description,
      tags: blogPost.tags,
      cover_image_url: blogPost.cover_image_url,
      is_published: blogPost.is_published,
      published_at: blogPost.published_at,
      created_by: blogPost.created_by,
      updated_by: blogPost.updated_by,
      view_count: blogPost.view_count,
      like_count: blogPost.like_count,
      created_at: blogPost.createdAt,
      updated_at: blogPost.updatedAt
    }
  });
});

/**
 * @desc    Create new blog post
 * @route   POST /api/admin/content/blog-posts
 * @access  Admin (can_manage_content)
 */
exports.createBlogPost = asyncHandler(async (req, res) => {
  const {
    title,
    slug,
    excerpt,
    content,
    meta_title,
    meta_description,
    tags,
    cover_image_url,
    is_published
  } = req.body;

  // Check if slug already exists
  if (slug) {
    const existingPost = await BlogPost.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({
        success: false,
        error: 'Slug already exists'
      });
    }
  }

  const blogPostData = {
    title,
    excerpt,
    content,
    created_by: req.user.id,
    updated_by: req.user.id
  };

  if (slug) blogPostData.slug = slug;
  if (meta_title) blogPostData.meta_title = meta_title;
  if (meta_description) blogPostData.meta_description = meta_description;
  if (tags) blogPostData.tags = tags;
  if (cover_image_url) blogPostData.cover_image_url = cover_image_url;
  if (is_published) {
    blogPostData.is_published = true;
    blogPostData.published_at = new Date();
  }

  const blogPost = await BlogPost.create(blogPostData);

  const populatedPost = await BlogPost.findById(blogPost._id)
    .populate('created_by', 'first_name last_name email')
    .populate('updated_by', 'first_name last_name email');

  res.status(201).json({
    success: true,
    data: populatedPost,
    message: 'Blog post created successfully'
  });
});

/**
 * @desc    Update blog post
 * @route   PUT /api/admin/content/blog-posts/:id
 * @access  Admin (can_manage_content)
 */
exports.updateBlogPost = asyncHandler(async (req, res) => {
  const {
    title,
    slug,
    excerpt,
    content,
    meta_title,
    meta_description,
    tags,
    cover_image_url,
    is_published
  } = req.body;

  const blogPost = await BlogPost.findById(req.params.id);

  if (!blogPost) {
    return res.status(404).json({
      success: false,
      error: 'Blog post not found'
    });
  }

  // Check if slug already exists (if changing slug)
  if (slug && slug !== blogPost.slug) {
    const existingPost = await BlogPost.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({
        success: false,
        error: 'Slug already exists'
      });
    }
  }

  // Update fields
  if (title) blogPost.title = title;
  if (slug) blogPost.slug = slug;
  if (excerpt) blogPost.excerpt = excerpt;
  if (content) blogPost.content = content;
  if (meta_title) blogPost.meta_title = meta_title;
  if (meta_description) blogPost.meta_description = meta_description;
  if (tags) blogPost.tags = tags;
  if (cover_image_url) blogPost.cover_image_url = cover_image_url;
  
  // Handle publish status
  if (typeof is_published === 'boolean') {
    const wasPublished = blogPost.is_published;
    blogPost.is_published = is_published;
    
    // Set published_at if publishing for the first time
    if (is_published && !wasPublished) {
      blogPost.published_at = new Date();
    }
  }

  blogPost.updated_by = req.user.id;
  await blogPost.save();

  const populatedPost = await BlogPost.findById(blogPost._id)
    .populate('created_by', 'first_name last_name email')
    .populate('updated_by', 'first_name last_name email');

  res.status(200).json({
    success: true,
    data: populatedPost,
    message: 'Blog post updated successfully'
  });
});

/**
 * @desc    Delete blog post
 * @route   DELETE /api/admin/content/blog-posts/:id
 * @access  Admin (can_manage_content)
 */
exports.deleteBlogPost = asyncHandler(async (req, res) => {
  const blogPost = await BlogPost.findById(req.params.id);

  if (!blogPost) {
    return res.status(404).json({
      success: false,
      error: 'Blog post not found'
    });
  }

  await BlogPost.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Blog post deleted successfully'
  });
});

/**
 * @desc    Publish blog post
 * @route   PUT /api/admin/content/blog-posts/:id/publish
 * @access  Admin (can_manage_content)
 */
exports.publishBlogPost = asyncHandler(async (req, res) => {
  const blogPost = await BlogPost.findById(req.params.id);

  if (!blogPost) {
    return res.status(404).json({
      success: false,
      error: 'Blog post not found'
    });
  }

  blogPost.is_published = true;
  blogPost.published_at = new Date();
  blogPost.updated_by = req.user.id;
  await blogPost.save();

  res.status(200).json({
    success: true,
    data: {
      id: blogPost._id,
      is_published: blogPost.is_published,
      published_at: blogPost.published_at
    },
    message: 'Blog post published successfully'
  });
});

/**
 * @desc    Get all content pages
 * @route   GET /api/admin/content/pages
 * @access  Admin (can_manage_content)
 */
exports.getAllPages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 25;
  const status = req.query.status || '';
  const type = req.query.type || '';
  const search = req.query.search || '';
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  // Build query
  const query = {};
  
  if (status === 'published') {
    query.is_published = true;
  } else if (status === 'draft') {
    query.is_published = false;
  }

  if (type) {
    query.page_type = type;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await ContentPage.countDocuments(query);

  // Get pages with updater data
  const pages = await ContentPage.find(query)
    .populate('updated_by', 'first_name last_name email')
    .sort({ [sortBy]: sortOrder })
    .skip(page * limit)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: {
      pages: pages.map(page => ({
        id: page._id,
        title: page.title,
        slug: page.slug,
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        is_published: page.is_published,
        page_type: page.page_type,
        updated_by: page.updated_by,
        view_count: page.view_count,
        created_at: page.createdAt,
        updated_at: page.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Create new content page
 * @route   POST /api/admin/content/pages
 * @access  Admin (can_manage_content)
 */
exports.createPage = asyncHandler(async (req, res) => {
  const {
    title,
    slug,
    content,
    meta_title,
    meta_description,
    page_type,
    is_published
  } = req.body;

  // Check if slug already exists
  if (slug) {
    const existingPage = await ContentPage.findOne({ slug });
    if (existingPage) {
      return res.status(400).json({
        success: false,
        error: 'Slug already exists'
      });
    }
  }

  const pageData = {
    title,
    content,
    updated_by: req.user.id
  };

  if (slug) pageData.slug = slug;
  if (meta_title) pageData.meta_title = meta_title;
  if (meta_description) pageData.meta_description = meta_description;
  if (page_type) pageData.page_type = page_type;
  if (is_published) pageData.is_published = true;

  const page = await ContentPage.create(pageData);

  const populatedPage = await ContentPage.findById(page._id)
    .populate('updated_by', 'first_name last_name email');

  res.status(201).json({
    success: true,
    data: populatedPage,
    message: 'Page created successfully'
  });
});

/**
 * @desc    Update content page
 * @route   PUT /api/admin/content/pages/:id
 * @access  Admin (can_manage_content)
 */
exports.updatePage = asyncHandler(async (req, res) => {
  const {
    title,
    slug,
    content,
    meta_title,
    meta_description,
    page_type,
    is_published
  } = req.body;

  const page = await ContentPage.findById(req.params.id);

  if (!page) {
    return res.status(404).json({
      success: false,
      error: 'Page not found'
    });
  }

  // Check if slug already exists (if changing slug)
  if (slug && slug !== page.slug) {
    const existingPage = await ContentPage.findOne({ slug });
    if (existingPage) {
      return res.status(400).json({
        success: false,
        error: 'Slug already exists'
      });
    }
  }

  // Update fields
  if (title) page.title = title;
  if (slug) page.slug = slug;
  if (content) page.content = content;
  if (meta_title) page.meta_title = meta_title;
  if (meta_description) page.meta_description = meta_description;
  if (page_type) page.page_type = page_type;
  if (typeof is_published === 'boolean') page.is_published = is_published;

  page.updated_by = req.user.id;
  await page.save();

  const populatedPage = await ContentPage.findById(page._id)
    .populate('updated_by', 'first_name last_name email');

  res.status(200).json({
    success: true,
    data: populatedPage,
    message: 'Page updated successfully'
  });
});

/**
 * @desc    Delete content page
 * @route   DELETE /api/admin/content/pages/:id
 * @access  Admin (can_manage_content)
 */
exports.deletePage = asyncHandler(async (req, res) => {
  const page = await ContentPage.findById(req.params.id);

  if (!page) {
    return res.status(404).json({
      success: false,
      error: 'Page not found'
    });
  }

  await ContentPage.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Page deleted successfully'
  });
});

/**
 * @desc    Get all studio content
 * @route   GET /api/admin/studio/content
 * @access  Admin (can_manage_content)
 */
exports.getStudioContent = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 25;
  const toolType = req.query.toolType || '';
  const search = req.query.search || '';
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  // Import studio models
  const ICP = require('../models/ICP');
  const UserStory = require('../models/UserStory');
  const PRD = require('../models/PRD');

  // Get all studio content from different models
  const [icpProfiles, userStories, prdDocuments] = await Promise.all([
    ICP.find().populate('user_id', 'email first_name last_name').sort({ [sortBy]: sortOrder }),
    UserStory.find().populate('user_id', 'email first_name last_name').sort({ [sortBy]: sortOrder }),
    PRD.find().populate('user_id', 'email first_name last_name').sort({ [sortBy]: sortOrder })
  ]);

  // Combine all content with type information
  const allContent = [
    ...icpProfiles.map(item => ({ ...item.toObject(), toolType: 'icp_profiles' })),
    ...userStories.map(item => ({ ...item.toObject(), toolType: 'user_stories' })),
    ...prdDocuments.map(item => ({ ...item.toObject(), toolType: 'prd_documents' }))
  ];

  // Filter by tool type if specified
  const filteredContent = toolType 
    ? allContent.filter(item => item.toolType === toolType)
    : allContent;

  // Filter by search if specified
  const searchedContent = search
    ? filteredContent.filter(item => 
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase()) ||
        item.user_id?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : filteredContent;

  // Sort combined content
  searchedContent.sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    if (aValue < bValue) return sortOrder;
    if (aValue > bValue) return -sortOrder;
    return 0;
  });

  // Paginate
  const startIndex = page * limit;
  const endIndex = startIndex + limit;
  const paginatedContent = searchedContent.slice(startIndex, endIndex);

  res.status(200).json({
    success: true,
    data: {
      content: paginatedContent,
      pagination: {
        page,
        limit,
        total: searchedContent.length,
        pages: Math.ceil(searchedContent.length / limit)
      }
    }
  });
});

/**
 * @desc    Delete studio content
 * @route   DELETE /api/admin/studio/:toolType/:id
 * @access  Admin (can_manage_content)
 */
exports.deleteStudioContent = asyncHandler(async (req, res) => {
  const { toolType, id } = req.params;

  let Model;
  switch (toolType) {
    case 'icp_profiles':
      Model = require('../models/ICP');
      break;
    case 'user_stories':
      Model = require('../models/UserStory');
      break;
    case 'prd_documents':
      Model = require('../models/PRD');
      break;
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid tool type'
      });
  }

  const content = await Model.findByIdAndDelete(id);

  if (!content) {
    return res.status(404).json({
      success: false,
      error: 'Content not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Content deleted successfully'
  });
});
