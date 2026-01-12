"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Card, CardContent } from "@/app/components/ui/card";
import { Upload, X, File, Image, Video, Music, FileText, FileImage, BookOpen, Loader2, Folder } from "lucide-react";
import { TreePickerDialog } from "@/app/components/TreePickerDialog";
import { toast } from "sonner";
import { Progress } from "@/app/components/ui/progress";

const categoryIcons = {
  videos: Video,
  images: Image,
  articles: FileText,
  sounds: Music,
  templates: FileImage,
  programs: BookOpen
};

const acceptedFormats = {
  videos: ".mp4,.mov,.avi,.mkv,.webm",
  images: ".jpg,.jpeg,.png,.gif,.webp,.svg",
  articles: ".pdf,.doc,.docx,.txt",
  sounds: ".mp3,.wav,.m4a,.ogg,.aac",
  templates: ".docx,.xlsx,.pptx,.pdf",
  programs: ".zip,.pdf,.docx"
};

const fileFieldNames = {
  videos: 'video',
  images: 'image',
  articles: 'article',
  sounds: 'sound',
  templates: 'template',
  programs: 'program'
};

export function FileUploadDialog({ category, currentFolderId, onUploadComplete, children }) {
  const [open, setOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [uploadAbortController, setUploadAbortController] = useState(null);
  
  // Folder selection state
  const [selectedFolderId, setSelectedFolderId] = useState(currentFolderId || null);
  const [availableFolders, setAvailableFolders] = useState([]);
  const [folderTree, setFolderTree] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [showTreePicker, setShowTreePicker] = useState(false);

  const IconComponent = categoryIcons[category] || File;

  // Map category to resourceType
  const getResourceType = () => {
    const mapping = {
      videos: 'video',
      images: 'image',
      articles: 'article',
      sounds: 'sound'
    };
    return mapping[category] || 'video';
  };

  // Fetch all folders for this category (for selection)
  useEffect(() => {
    const fetchFolders = async () => {
      if (!category || !open) return;
      
      try {
        setLoadingFolders(true);
        const resourceType = getResourceType();
        // Fetch all folders (tree structure) for this category
        const response = await fetch(`/api/library/folders?resourceType=${resourceType}&tree=true`);
        const result = await response.json();
        
        if (result.status) {
          setFolderTree(result.folders || []);
          // Also keep flattened for backward compatibility if needed
          const flattenFolders = (folders, parentPath = '') => {
            let flat = [];
            folders.forEach(folder => {
              const path = parentPath ? `${parentPath} / ${folder.name}` : folder.name;
              flat.push({ ...folder, displayPath: path });
              if (folder.children && folder.children.length > 0) {
                flat = [...flat, ...flattenFolders(folder.children, path)];
              }
            });
            return flat;
          };
          
          setAvailableFolders(flattenFolders(result.folders || []));
        }
      } catch (error) {
        console.error('Error fetching folders:', error);
        setAvailableFolders([]);
      } finally {
        setLoadingFolders(false);
      }
    };

    fetchFolders();
  }, [category, open]);

  // Update selectedFolderId when currentFolderId changes
  useEffect(() => {
    setSelectedFolderId(currentFolderId || null);
  }, [currentFolderId]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setTitle(e.dataTransfer.files[0].name.split('.')[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setTitle(e.target.files[0].name.split('.')[0]);
    }
  };

  const handleSelectFileClick = () => {
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fileInput.click();
    }
  };

  // Upload using presigned URL with progress tracking and retry logic
  const uploadWithPresignedUrl = async (presignedUrl, file, onProgress, abortSignal) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle abort
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      }

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Set timeout (30 minutes for large files)
      xhr.timeout = 30 * 60 * 1000;

      // Start upload
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  // Upload a single chunk with progress tracking
  const uploadChunk = async (presignedUrl, chunk, partNumber, onChunkProgress, abortSignal) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle abort
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      }

      // Track chunk upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onChunkProgress) {
          const chunkProgress = (e.loaded / e.total) * 100;
          onChunkProgress(partNumber, chunkProgress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Extract ETag from response headers (required for multipart completion)
          const etag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag');
          if (!etag) {
            reject(new Error(`Missing ETag in response for part ${partNumber}`));
            return;
          }
          resolve({ partNumber, etag: etag.replace(/"/g, '') }); // Remove quotes from ETag
        } else {
          reject(new Error(`Chunk ${partNumber} upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error(`Network error during chunk ${partNumber} upload`));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error(`Chunk ${partNumber} upload timeout`));
      });

      // Set timeout (10 minutes per chunk)
      xhr.timeout = 10 * 60 * 1000;

      // Start upload
      xhr.open('PUT', presignedUrl);
      xhr.send(chunk);
    });
  };

  // Upload chunks in parallel with progress tracking
  const uploadChunksInParallel = async (
    file,
    filePath,
    uploadId,
    chunkSize,
    totalChunks,
    onProgress,
    abortSignal,
    maxParallel = 3
  ) => {
    const uploadedParts = [];
    const chunkProgress = new Map(); // Track progress of each chunk

    // Function to update overall progress
    const updateOverallProgress = () => {
      let totalProgress = 0;
      chunkProgress.forEach((progress) => {
        totalProgress += progress;
      });
      const overallProgress = (totalProgress / totalChunks);
      onProgress(overallProgress);
    };

    // Function to upload a single chunk with retry
    const uploadChunkWithRetry = async (chunkIndex) => {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      const partNumber = chunkIndex + 1;

      // Get presigned URL for this chunk
      const partUrlResponse = await fetch('/api/library/upload/part-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          uploadId,
          partNumber,
        }),
        signal: abortSignal,
      });

      if (!partUrlResponse.ok) {
        throw new Error(`Failed to get presigned URL for part ${partNumber}`);
      }

      const partUrlResult = await partUrlResponse.json();
      if (!partUrlResult.success) {
        throw new Error(partUrlResult.error || `Failed to get presigned URL for part ${partNumber}`);
      }

      // Upload chunk with retry
      return await retryWithBackoff(async () => {
        return await uploadChunk(
          partUrlResult.presignedUrl,
          chunk,
          partNumber,
          (partNum, progress) => {
            chunkProgress.set(partNum, progress);
            updateOverallProgress();
          },
          abortSignal
        );
      });
    };

    // Upload chunks in batches (maxParallel at a time)
    const chunks = Array.from({ length: totalChunks }, (_, i) => i);
    
    for (let i = 0; i < chunks.length; i += maxParallel) {
      const batch = chunks.slice(i, i + maxParallel);
      const batchPromises = batch.map(chunkIndex => uploadChunkWithRetry(chunkIndex));
      
      const batchResults = await Promise.all(batchPromises);
      uploadedParts.push(...batchResults);
    }

    // Sort by part number
    uploadedParts.sort((a, b) => a.partNumber - b.partNumber);
    
    return uploadedParts;
  };

  // Retry logic with exponential backoff
  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on abort or cancellation
        if (error.message.includes('cancelled') || error.message.includes('abort')) {
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff (1s, 2s, 4s)
        const delay = baseDelay * Math.pow(2, attempt);
        setRetryCount(attempt + 1);
        setIsRetrying(true);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    setIsRetrying(false);
    throw lastError;
  };

  const handleUpload = async () => {
    // Check for missing fields and show comprehensive error message
    const missingFields = [];
    
    if (!selectedFile) {
      missingFields.push("File selection");
    }
    
    if (!title.trim()) {
      missingFields.push("Title");
    }
    
    if (!description.trim()) {
      missingFields.push("Description");
    }
    
    if (missingFields.length > 0) {
      const errorMessage = missingFields.length === 1 
        ? `Please fill in: ${missingFields[0]}`
        : `Please fill in the following fields: ${missingFields.join(", ")}`;
        
      toast.error("Missing Required Information", {
        description: errorMessage
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setRetryCount(0);
    setIsRetrying(false);
    
    // Create abort controller for cancellation
    const abortController = new AbortController();
    setUploadAbortController(abortController);
    
    try {
      const fileSize = selectedFile.size;

      // Step 1: Get presigned URL (with retry)
      let initiateResult;
      await retryWithBackoff(async () => {
        const initiateResponse = await fetch('/api/library/upload/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileSize: fileSize,
            fileType: selectedFile.type,
            category: category,
          }),
          signal: abortController.signal,
        });

        if (!initiateResponse.ok) {
          throw new Error(`Failed to initiate upload: ${initiateResponse.statusText}`);
        }

        initiateResult = await initiateResponse.json();

        if (!initiateResult.success) {
          throw new Error(initiateResult.error || 'Failed to initiate upload');
        }
      });

      // Step 2: Upload file (single or multipart)
      let uploadedParts = [];
      
      if (initiateResult.uploadType === 'multipart') {
        // Multipart upload for large files
        uploadedParts = await uploadChunksInParallel(
          selectedFile,
          initiateResult.filePath,
          initiateResult.uploadId,
          initiateResult.chunkSize,
          initiateResult.totalChunks,
          (progress) => setUploadProgress(progress * 100),
          abortController.signal,
          3 // Max 3 parallel uploads
        );
      } else {
        // Single PUT upload for smaller files
        await retryWithBackoff(async () => {
          await uploadWithPresignedUrl(
            initiateResult.presignedUrl,
            selectedFile,
            (progress) => setUploadProgress(progress),
            abortController.signal
          );
        });
      }

      // Step 3: Complete upload (save metadata to database) (with retry)
      let completeResult;
      await retryWithBackoff(async () => {
        if (initiateResult.uploadType === 'multipart') {
          // Complete multipart upload
          const completeResponse = await fetch('/api/library/upload/complete-multipart', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePath: initiateResult.filePath,
              fileName: initiateResult.fileName,
              uploadId: initiateResult.uploadId,
              parts: uploadedParts,
              title: title.trim(),
              description: description.trim(),
              author: category === 'articles' ? author.trim() : '',
              category: category,
              fileSize: fileSize,
              fileType: selectedFile.type,
              folderId: selectedFolderId || null,
            }),
            signal: abortController.signal,
          });

          if (!completeResponse.ok) {
            throw new Error(`Failed to complete multipart upload: ${completeResponse.statusText}`);
          }

          completeResult = await completeResponse.json();

          if (!completeResult.success) {
            throw new Error(completeResult.error || 'Failed to complete multipart upload');
          }
        } else {
          // Complete single upload
          const completeResponse = await fetch('/api/library/upload/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePath: initiateResult.filePath,
              fileName: initiateResult.fileName,
              title: title.trim(),
              description: description.trim(),
              author: category === 'articles' ? author.trim() : '',
              category: category,
              fileSize: fileSize,
              fileType: selectedFile.type,
              folderId: selectedFolderId || null,
            }),
            signal: abortController.signal,
          });

          if (!completeResponse.ok) {
            throw new Error(`Failed to complete upload: ${completeResponse.statusText}`);
          }

          completeResult = await completeResponse.json();

          if (!completeResult.success) {
            throw new Error(completeResult.error || 'Failed to complete upload');
          }
        }
      });

      // Success!
      toast.success("Upload Successful", {
        description: `${title} has been uploaded to ${category}.`
      });
      
      onUploadComplete?.(completeResult.data);
      
      // Reset form
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      setAuthor("");
      setUploadProgress(0);
      setRetryCount(0);
      setIsRetrying(false);
      setSelectedFolderId(currentFolderId || null); // Reset to current folder
      setOpen(false);
    } catch (error) {
      console.error('Upload error:', error);
      
      // Don't show error toast if upload was cancelled
      if (error.message.includes('cancelled') || error.message.includes('abort')) {
        toast.info("Upload Cancelled", {
          description: "The upload was cancelled."
        });
      } else {
        const errorMessage = retryCount > 0
          ? `${error.message} (Retried ${retryCount} time${retryCount > 1 ? 's' : ''})`
          : error.message || "An error occurred while uploading the file";
        
        toast.error("Upload Failed", {
          description: errorMessage
        });
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setRetryCount(0);
      setIsRetrying(false);
      setUploadAbortController(null);
    }
  };

  const handleDialogClose = (newOpen) => {
    if (!newOpen && uploading && uploadAbortController) {
      // If closing during upload, cancel the upload
      uploadAbortController.abort();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            Upload to {category.charAt(0).toUpperCase() + category.slice(1)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? "border-primary bg-primary/5" 
                : !selectedFile 
                  ? "border-red-300 bg-red-50/50" 
                  : "border-muted-foreground/25"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <File className="h-8 w-8 text-primary" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {uploading && (
                    <div className="space-y-1">
                      <Progress value={uploadProgress} className="w-full" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {uploadProgress.toFixed(0)}% uploaded
                          {isRetrying && (
                            <span className="ml-2 text-amber-600">
                              (Retrying... {retryCount}/{3})
                            </span>
                          )}
                        </span>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <span className="text-muted-foreground/60">
                            {selectedFile.size > 0 
                              ? `${((selectedFile.size * uploadProgress) / 100 / 1024 / 1024).toFixed(2)} MB / ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                              : 'Uploading...'
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-lg font-medium">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Accepted formats: {acceptedFormats[category]}
                  </p>
                  <p className="text-xs text-red-500 mt-2">⚠️ Please select a file to upload</p>
                </div>
                <Input
                  type="file"
                  accept={acceptedFormats[category]}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button 
                  variant="outline" 
                  className="w-full cursor-pointer"
                  onClick={handleSelectFileClick}
                >
                  Select File
                </Button>
              </div>
            )}
          </div>

          {/* File Information */}
          <div className="space-y-4">
            {/* Folder Selection */}
            <div className="space-y-2">
              <Label>Upload to Folder</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 border rounded-lg bg-muted/50 flex items-center gap-2">
                  <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedFolderId ? (
                      loadingFolders ? 'Loading...' : (
                        availableFolders.find(f => f.id === selectedFolderId)?.displayPath || 'Selected folder'
                      )
                    ) : (
                      'Root (No Folder)'
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTreePicker(true)}
                  disabled={loadingFolders}
                >
                  Change
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter file title"
                className={!title.trim() ? "border-red-500 focus:border-red-500" : ""}
              />
              {!title.trim() && (
                <p className="text-xs text-red-500">Title is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the content and purpose of this file"
                rows={3}
                required
                className={!description.trim() ? "border-red-500" : ""}
              />
              <div className="text-xs text-muted-foreground">
                {description.length} characters {!description.trim() && "(Required)"}
              </div>
            </div>

            {category === 'articles' && (
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name"
                />
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (uploading && uploadAbortController) {
                  uploadAbortController.abort();
                }
                setOpen(false);
              }}
              disabled={uploading && !uploadAbortController}
            >
              {uploading ? 'Cancel' : 'Close'}
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRetrying ? `Retrying... (${retryCount}/3)` : 'Uploading...'}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Tree Picker Dialog */}
      <TreePickerDialog
        open={showTreePicker}
        onOpenChange={setShowTreePicker}
        folders={folderTree}
        selectedFolderId={selectedFolderId}
        onSelect={(folderId) => {
          setSelectedFolderId(folderId);
          setShowTreePicker(false);
        }}
        title="Select Upload Folder"
        allowRoot={true}
        categoryInfo={{
          color: category === 'videos' ? 'bg-primary' : 
                 category === 'images' ? 'bg-accent' : 
                 category === 'articles' ? 'bg-secondary' : 
                 'bg-blue-teal'
        }}
      />
    </Dialog>
  );
}