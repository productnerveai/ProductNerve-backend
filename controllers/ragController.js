const Project = require('../models/Project');
const { uploadFileToSpaces, deleteFileFromSpaces } = require('../utils/fileUpload');
const asyncHandler = require('../middleware/asyncHandler'); 
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif'
];

/**
 * Validate file before upload
 * @param {Object} file - File object
 * @returns {Object} - Validation result
 */
function validateFile(file) {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 50MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: PDF, Word, Excel, PowerPoint, Text, CSV, and images`
    };
  }

  return {
    valid: true
  };
}

/**
 * Get file size in human readable format
 * @param {Number} bytes - File size in bytes
 * @returns {String} - Human readable file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if adding a file would exceed project's RAG folder limit
 * @param {Number} currentTotalSize - Current total size in bytes
 * @param {Number} newFileSize - New file size in bytes
 * @returns {Object} - Check result
 */
function checkSizeLimit(currentTotalSize, newFileSize) {
  const newTotal = currentTotalSize + newFileSize;
  const limit = MAX_FILE_SIZE;
  
  return {
    canUpload: newTotal <= limit,
    currentSize: currentTotalSize,
    newFileSize,
    newTotal,
    limit,
    remaining: limit - currentTotalSize,
    usagePercentage: (currentTotalSize / limit) * 100
  };
}

/**
 * Generate content summary for uploaded file (placeholder for future AI processing)
 * @param {String} filename - Name of the file
 * @param {String} fileType - Type of the file
 * @returns {String} - Generated summary
 */
function generateContentSummary(filename, fileType) {
  // This is a placeholder - in production, you'd use AI to analyze file content
  const fileExtension = filename.split('.').pop().toLowerCase();
  
  switch (fileExtension) {
    case 'pdf':
      return 'PDF document uploaded for project context';
    case 'doc':
    case 'docx':
      return 'Word document uploaded for project context';
    case 'xls':
    case 'xlsx':
      return 'Excel spreadsheet uploaded for project context';
    case 'ppt':
    case 'pptx':
      return 'PowerPoint presentation uploaded for project context';
    case 'txt':
      return 'Text document uploaded for project context';
    case 'csv':
      return 'CSV data uploaded for project context';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'Image uploaded for project context';
    default:
      return 'File uploaded for project context';
  }
}

// @desc    Upload file to RAG folder
// @route   POST /api/projects/:projectId/rag/upload
// @access  Private
exports.uploadRAGFile = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Check if user owns the workspace
  const Workspace = require('../models/Workspace');
  const workspace = await Workspace.findById(project.workspace_id);
  if (!workspace || workspace.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this project'
    });
  }

  // Initialize RAG folder if it doesn't exist
  if (!project.rag_folder) {
    project.rag_folder = {
      files: [],
      total_size: 0,
      max_size_limit: 52428800, // 50MB
      last_updated: new Date()
    };
  }

  // Check if file was uploaded
  if (!req.body.file || !req.body.file.data) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  try {
    // Extract file data from FormData
    const fileData = req.body.file;
    const fileBuffer = Buffer.from(fileData.data, 'base64');
    
    // Create file object for validation
    const fileObj = {
      size: fileBuffer.length,
      mimetype: fileData.type
    };

    // Validate file
    const validation = validateFile(fileObj);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    // Check size limit before uploading
    const sizeCheck = checkSizeLimit(project.rag_folder.total_size, fileBuffer.length);
    if (!sizeCheck.canUpload) {
      return res.status(400).json({
        success: false,
        message: 'File would exceed RAG folder size limit',
        data: {
          currentSize: formatFileSize(sizeCheck.currentSize),
          newFileSize: formatFileSize(sizeCheck.newFileSize),
          limit: formatFileSize(sizeCheck.limit),
          remaining: formatFileSize(sizeCheck.remaining),
          usagePercentage: sizeCheck.usagePercentage
        }
      });
    }

    // Upload file to DigitalOcean Spaces using existing utility
    const fileUrl = await uploadFileToSpaces(
      fileBuffer,
      fileData.name,
      fileData.type,
      `rag-files/${projectId}`
    );

    // Generate unique filename for storage
    const path = require('path');
    const fileExtension = path.extname(fileData.name);
    const crypto = require('crypto');
    const uniqueFilename = crypto.randomBytes(16).toString('hex') + fileExtension;

    // Generate content summary
    const contentSummary = generateContentSummary(fileData.name, fileData.type);

    // Add file to project's RAG folder
    const newFileData = {
      filename: uniqueFilename,
      original_name: fileData.name,
      file_size: fileBuffer.length,
      file_type: fileData.type,
      upload_date: new Date(),
      file_url: fileUrl,
      content_summary: contentSummary
    };

    project.rag_folder.files.push(newFileData);
    project.rag_folder.total_size += fileBuffer.length;
    project.rag_folder.last_updated = new Date();

    await project.save();

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file: fileData,
        folderStats: {
          totalFiles: project.rag_folder.files.length,
          totalSize: formatFileSize(project.rag_folder.total_size),
          maxSizeLimit: formatFileSize(project.rag_folder.max_size_limit),
          usagePercentage: (project.rag_folder.total_size / project.rag_folder.max_size_limit) * 100,
          remaining: formatFileSize(project.rag_folder.max_size_limit - project.rag_folder.total_size)
        }
      }
    });
  } catch (error) {
    console.error('Error uploading RAG file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during file upload',
      error: error.message
    });
  }
});

// @desc    Get RAG folder contents
// @route   GET /api/projects/:projectId/rag
// @access  Private
exports.getRAGFolder = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Check if user owns the workspace
  const Workspace = require('../models/Workspace');
  const workspace = await Workspace.findById(project.workspace_id);
  if (!workspace || workspace.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this project'
    });
  }

  // Initialize RAG folder if it doesn't exist
  if (!project.rag_folder) {
    project.rag_folder = {
      files: [],
      total_size: 0,
      max_size_limit: 52428800,
      last_updated: new Date()
    };
    await project.save();
  }

  res.status(200).json({
    success: true,
    data: {
      files: project.rag_folder.files,
      folderStats: {
        totalFiles: project.rag_folder.files.length,
        totalSize: formatFileSize(project.rag_folder.total_size),
        maxSizeLimit: formatFileSize(project.rag_folder.max_size_limit),
        usagePercentage: project.rag_folder.total_size > 0 ? 
          (project.rag_folder.total_size / project.rag_folder.max_size_limit) * 100 : 0,
        remaining: formatFileSize(project.rag_folder.max_size_limit - project.rag_folder.total_size),
        lastUpdated: project.rag_folder.last_updated
      }
    }
  });
});

// @desc    Delete file from RAG folder
// @route   DELETE /api/projects/:projectId/rag/:fileId
// @access  Private
exports.deleteRAGFile = asyncHandler(async (req, res) => {
  const { projectId, fileId } = req.params;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Check if user owns the workspace
  const Workspace = require('../models/Workspace');
  const workspace = await Workspace.findById(project.workspace_id);
  if (!workspace || workspace.user_id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this project'
    });
  }

  // Check if RAG folder exists
  if (!project.rag_folder || !project.rag_folder.files) {
    return res.status(404).json({
      success: false,
      message: 'RAG folder not found'
    });
  }

  // Find the file to delete
  const fileIndex = project.rag_folder.files.findIndex(
    file => file._id.toString() === fileId
  );

  if (fileIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'File not found in RAG folder'
    });
  }

  const fileToDelete = project.rag_folder.files[fileIndex];

  try {
    // Delete from DigitalOcean Spaces using existing utility
    await deleteFileFromSpaces(fileToDelete.file_url);

    // Remove file from project's RAG folder
    project.rag_folder.files.splice(fileIndex, 1);
    project.rag_folder.total_size -= fileToDelete.file_size;
    project.rag_folder.last_updated = new Date();

    await project.save();

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: {
        deletedFile: fileToDelete,
        folderStats: {
          totalFiles: project.rag_folder.files.length,
          totalSize: formatFileSize(project.rag_folder.total_size),
          maxSizeLimit: formatFileSize(project.rag_folder.max_size_limit),
          usagePercentage: project.rag_folder.total_size > 0 ? 
            (project.rag_folder.total_size / project.rag_folder.max_size_limit) * 100 : 0,
          remaining: formatFileSize(project.rag_folder.max_size_limit - project.rag_folder.total_size)
        }
      }
    });
  } catch (error) {
    console.error('Error deleting RAG file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during file deletion',
      error: error.message
    });
  }
});

// @desc    Get RAG folder content for AI context
// @route   GET /api/projects/:projectId/rag/context
// @access  Private (Internal use for AI processing)
exports.getRAGContext = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Verify project exists
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Return RAG folder content for AI processing
  if (!project.rag_folder || !project.rag_folder.files || project.rag_folder.files.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        context: 'No RAG files available for this project',
        files: []
      }
    });
  }

  // Format files for AI context
  const contextFiles = project.rag_folder.files.map(file => ({
    name: file.original_name,
    type: file.file_type,
    size: formatFileSize(file.file_size),
    summary: file.content_summary,
    uploadDate: file.upload_date
  }));

  const contextIntro = `Project RAG Context: This project has ${contextFiles.length} reference files uploaded for additional context. These files contain project-specific information that should be referenced during analysis and validation.`;

  res.status(200).json({
    success: true,
    data: {
      context: contextIntro,
      files: contextFiles,
      totalSize: formatFileSize(project.rag_folder.total_size)
    }
  });
});