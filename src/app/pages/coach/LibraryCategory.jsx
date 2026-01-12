"use client"
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/app/context/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";
import { 
  ArrowLeft,
  Video, 
  Image, 
  FileText, 
  Music, 
  FileImage,
  BookOpen,
  Play,
  Download,
  Eye,
  Upload,
  Share2,
  CheckSquare,
  Square,
  Grid3X3,
  List,
  X,
  Loader2,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  FolderOpen,
  Scissors,
  Clipboard,
  X as XIcon,
  Layers
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { FileUploadDialog } from "@/app/components/FileUploadDialog";
import { ShareFileDialog } from "@/app/components/ShareFileDialog";
import { TreePickerDialog } from "@/app/components/TreePickerDialog";
import { ToggleGroup, ToggleGroupItem } from "@/app/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { toast } from "sonner";

// Note: categoryData is now using translations in the component
const getCategoryData = (t) => ({
  videos: {
    title: t('library.videos', 'Videos'),
    icon: Video,
    color: "bg-primary"
  },
  images: {
    title: t('library.images', 'Images'),
    icon: Image,
    color: "bg-accent"
  },
  articles: {
    title: t('library.articles', 'Articles'),
    icon: FileText,
    color: "bg-secondary"
  },
  sounds: {
    title: t('library.sounds', 'Sounds'),
    icon: Music,
    color: "bg-blue-teal"
  },
});

// Recursive Folder Tree Item Component
function FolderTreeItem({ 
  folder, 
  depth, 
  expandedFolders, 
  onToggleExpand, 
  onNavigate,
  onEdit,
  onDelete,
  onPaste,
  cutFiles,
  movingFiles,
  dragOverFolderId,
  onDragOver,
  onDragLeave,
  onDrop,
  categoryInfo,
  isMobile,
  t
}) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedFolders.has(folder.id);
  const indentLevel = depth * 24; // 24px per level

  return (
    <div>
      <Card
        className={`group hover:shadow-medium transition-all cursor-pointer border-2 hover:border-primary/50 ${
          dragOverFolderId === folder.id ? 'border-primary border-4 bg-primary/10' : ''
        }`}
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, folder.id)}
      >
        <CardContent className={`p-3 ${isMobile ? 'p-2' : ''}`}>
          <div className="flex items-start justify-between gap-2">
            <div 
              className="flex items-center gap-2 flex-1 min-w-0"
              style={{ paddingLeft: `${indentLevel}px` }}
            >
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(folder.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="w-6 shrink-0" /> // Spacer for alignment
              )}
              <div 
                className={`${categoryInfo.color} rounded-lg p-1.5 shrink-0 cursor-pointer`}
                onClick={() => onNavigate(folder.id)}
              >
                <Folder className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h4 
                        className={`font-medium text-foreground truncate ${isMobile ? 'text-xs' : 'text-sm'} cursor-pointer`}
                        onClick={() => onNavigate(folder.id)}
                      >
                        {folder.name}
                      </h4>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{folder.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {cutFiles.length > 0 && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPaste(folder.id);
                  }}
                  disabled={movingFiles}
                  className="opacity-100 text-xs"
                >
                  {movingFiles ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    t('library.moveHere', 'Move Here')
                  )}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      // Use requestAnimationFrame to ensure dropdown closes first
                      requestAnimationFrame(() => {
                        onEdit(folder);
                      });
                    }}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    {t('common.buttons.edit', 'Edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      // Use requestAnimationFrame to ensure dropdown closes first
                      requestAnimationFrame(() => {
                        onDelete(folder.id);
                      });
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('common.buttons.delete', 'Delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onNavigate={onNavigate}
              onEdit={onEdit}
              onDelete={onDelete}
              onPaste={onPaste}
              cutFiles={cutFiles}
              movingFiles={movingFiles}
              dragOverFolderId={dragOverFolderId}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              categoryInfo={categoryInfo}
              isMobile={isMobile}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LibraryCategory() {
  const { category } = useParams();
  const router = useRouter();
  const t = useTranslation();
  
  const categoryData = getCategoryData(t);
  const categoryInfo = categoryData[category];
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [downloadingItemId, setDownloadingItemId] = useState(null);
  
  // Folder state
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root level
  const [folders, setFolders] = useState([]);
  const [folderTree, setFolderTree] = useState([]); // Full tree structure
  const [folderPath, setFolderPath] = useState([]); // Breadcrumb path
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [deletingFolderId, setDeletingFolderId] = useState(null);
  const [updatingFolder, setUpdatingFolder] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const [deletingFiles, setDeletingFiles] = useState(false);
  const [folderViewMode, setFolderViewMode] = useState('current'); // 'current' or 'tree'
  const [expandedFolders, setExpandedFolders] = useState(new Set()); // Track expanded folders in tree view
  const [newFolderParentId, setNewFolderParentId] = useState(null); // For creating subfolders
  const [showTreePicker, setShowTreePicker] = useState(false); // For tree picker dialog
  
  // Cut/Paste state
  const [cutFiles, setCutFiles] = useState([]); // Array of file IDs that are cut
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState([]);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [movingFiles, setMovingFiles] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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

  // Flatten folder tree for dropdown selection
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

  // Get folder path from tree structure
  const getFolderPathFromTree = (folderId, tree = folderTree) => {
    if (!folderId) return [];
    
    const findPath = (folders, targetId, currentPath = []) => {
      for (const folder of folders) {
        const newPath = [...currentPath, folder];
        if (folder.id === targetId) {
          return newPath;
        }
        if (folder.children && folder.children.length > 0) {
          const found = findPath(folder.children, targetId, newPath);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findPath(tree, folderId) || [];
  };


  // Fetch folders (current level or tree)
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setLoadingFolders(true);
        const resourceType = getResourceType();
        
        if (folderViewMode === 'tree') {
          // Fetch full tree structure
          const url = `/api/library/folders?resourceType=${resourceType}&tree=true`;
          const response = await fetch(url);
          const result = await response.json();
          
          if (result.status) {
            setFolderTree(result.folders || []);
            // Also set folders to empty for tree view
            setFolders([]);
          } else {
            setFolderTree([]);
            setFolders([]);
          }
        } else {
          // Fetch current level only
          const parentId = currentFolderId || null;
          const url = `/api/library/folders?resourceType=${resourceType}&parentFolderId=${parentId || 'null'}`;
          const response = await fetch(url);
          const result = await response.json();
          
          if (result.status) {
            setFolders(result.folders || []);
            setFolderTree([]);
          } else {
            setFolders([]);
            setFolderTree([]);
          }
        }
      } catch (error) {
        console.error('Error fetching folders:', error);
        setFolders([]);
        setFolderTree([]);
      } finally {
        setLoadingFolders(false);
      }
    };

    if (category) {
      fetchFolders();
    }
  }, [category, currentFolderId, folderViewMode]);

  // Fetch folder path (breadcrumb)
  useEffect(() => {
    const fetchFolderPath = async () => {
      if (!currentFolderId) {
        setFolderPath([]);
        return;
      }

      try {
        const response = await fetch(`/api/library/folders/${currentFolderId}?withPath=true`);
        const result = await response.json();
        
        if (result.status && result.path) {
          setFolderPath(result.path);
        } else {
          setFolderPath([]);
        }
      } catch (error) {
        console.error('Error fetching folder path:', error);
        setFolderPath([]);
      }
    };

    if (currentFolderId) {
      fetchFolderPath();
    } else {
      setFolderPath([]);
    }
  }, [currentFolderId]);

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const folderParam = currentFolderId ? `&folderId=${currentFolderId}` : '&folderId=null';
        const response = await fetch(`/api/library/${category}?${folderParam}`);
        const result = await response.json();
        
        if (result.status) {
          const itemsKey = category === 'articles' ? 'articles' : category;
          const fetchedItems = result[itemsKey] || [];
          
          // Check for missing IDs and filter them out
          const itemsWithoutId = fetchedItems.filter(item => !item.id);
          if (itemsWithoutId.length > 0) {
            console.warn('Items without ID found:', itemsWithoutId);
          }
          
          // Filter out items without IDs to prevent sharing errors
          const validItems = fetchedItems.filter(item => item.id);
          setItems(validItems);
        } else {
          console.error('Failed to fetch items:', result.message);
          setItems([]);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      fetchItems();
    }
  }, [category, currentFolderId]);

  const handleFileUpload = (uploadedFile) => {
    // Debug: Log the uploaded file structure
    console.log('Uploaded file data:', uploadedFile);
    
    // Transform the uploaded file data to match expected structure
    let transformedFile;
    
    // Handle different nested data structures from various APIs
    const nestedTypes = ['image', 'article', 'video', 'sound', 'template', 'program'];
    let foundNestedType = null;
    
    for (const type of nestedTypes) {
      if (uploadedFile[type] && uploadedFile[type].id) {
        foundNestedType = type;
        break;
      }
    }
    
    if (foundNestedType) {
      // If the file has a nested property (from API response), use that as the main data
      transformedFile = {
        ...uploadedFile[foundNestedType],
        url: uploadedFile.url,
        filename: uploadedFile.filename
      };
      console.log(`Transformed file (from ${foundNestedType} property):`, transformedFile);
    } else {
      // If it's already in the correct format, use as is
      transformedFile = uploadedFile;
      console.log('Using file as-is:', transformedFile);
    }
    
    // Verify the transformed file has required fields
    if (!transformedFile.id) {
      console.error('Transformed file missing ID:', transformedFile);
      toast.error(t('library.uploadMissingId', 'Uploaded file is missing required ID. Please refresh the page.'));
      return;
    }
    
    // Add the new file to the items list
    setItems(prev => [transformedFile, ...prev]);
    toast.success(t('library.fileUploaded', 'File uploaded successfully'));
  };

  const handleFileShare = (file, shareData) => {
    // In a real app, this would handle the sharing logic
    console.log('File shared:', file, 'with:', shareData);
  };

  const handleFileToggle = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === items.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(items.map(item => item.id));
    }
  };

  const handleShareSelected = (shareData) => {
    const selectedItems = items.filter(item => selectedFiles.includes(item.id));
    
    const count = selectedFiles.length;
    const fileText = count === 1 ? 'file has' : 'files have';
    const description = `${count} ${fileText} been shared.`;
    toast.success(t('library.filesShared', 'Files Shared Successfully'), {
      description: description
    });
    
    // Clear selection after sharing
    setSelectedFiles([]);
  };

  const getSelectedFiles = () => {
    return items.filter(item => selectedFiles.includes(item.id));
  };

  const handleDeleteFile = async (fileId) => {
    try {
      setDeletingFileId(fileId);
      const response = await fetch(`/api/library/resources/${fileId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.status) {
        toast.success(t('library.fileDeleted', 'File deleted successfully'));
        // Remove from items list
        setItems(prev => prev.filter(item => item.id !== fileId));
        // Remove from selection if selected
        setSelectedFiles(prev => prev.filter(id => id !== fileId));
      } else {
        toast.error(result.message || t('library.fileDeleteFailed', 'Failed to delete file'));
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error(t('library.fileDeleteFailed', 'Failed to delete file'));
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleDeleteSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setDeletingFiles(true);
      const deletePromises = selectedFiles.map(fileId => 
        fetch(`/api/library/resources/${fileId}`, { method: 'DELETE' })
      );

      const results = await Promise.allSettled(deletePromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`${successful} file(s) deleted successfully`);
        // Remove deleted files from items list
        setItems(prev => prev.filter(item => !selectedFiles.includes(item.id)));
        setSelectedFiles([]);
      }
      
      if (failed > 0) {
        toast.error(`${failed} file(s) failed to delete`);
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error(t('library.filesDeleteFailed', 'Failed to delete files'));
    } finally {
      setDeletingFiles(false);
    }
  };

  const handlePreview = (item) => {
    // Since the direct URL works in browser, let's try using it directly first
    // If that fails, we can fall back to the preview API
    const directUrl = item.url;
    
    // Determine if this is a PDF or other document type
    const fileName = item.fileName || item.url.split('/').pop() || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    console.log('🔍 Opening preview for:', {
      title: item.title,
      url: directUrl,
      fileName: fileName,
      extension: fileExtension,
      category: category
    });
    
    // Set preview type based on actual file type, not category
    if (fileExtension === 'pdf') {
      setPreviewType('pdf');
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(fileExtension)) {
      setPreviewType('document');
    } else {
      setPreviewType(category);
    }
    
    setPreviewUrl(directUrl);
  };

  // Folder handlers
  // Initialize newFolderParentId to currentFolderId when dialog opens
  useEffect(() => {
    if (showCreateFolderDialog) {
      setNewFolderParentId(currentFolderId);
    }
  }, [showCreateFolderDialog, currentFolderId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error(t('library.folderNameRequired', 'Folder name is required'));
      return;
    }

    try {
      setCreatingFolder(true);
      const resourceType = getResourceType();
      const parentId = newFolderParentId;
      const response = await fetch('/api/library/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          resourceType,
          parentFolderId: parentId
        })
      });

      const result = await response.json();
      
      if (result.status) {
        toast.success(t('library.folderCreated', 'Folder created successfully'));
        setShowCreateFolderDialog(false);
        setNewFolderName("");
        setNewFolderParentId(null);
        // Refresh folders list based on current view mode
        if (folderViewMode === 'tree') {
          const treeUrl = `/api/library/folders?resourceType=${resourceType}&tree=true`;
          const treeResponse = await fetch(treeUrl);
          const treeResult = await treeResponse.json();
          if (treeResult.status) {
            setFolderTree(treeResult.folders || []);
            // Auto-expand parent folder if creating subfolder
            if (parentId) {
              setExpandedFolders(prev => new Set([...prev, parentId]));
            }
          }
        } else {
          const parentId = currentFolderId || null;
          const url = `/api/library/folders?resourceType=${resourceType}&parentFolderId=${parentId || 'null'}`;
          const foldersResponse = await fetch(url);
          const foldersResult = await foldersResponse.json();
          if (foldersResult.status) {
            setFolders(foldersResult.folders || []);
          }
        }
      } else {
        toast.error(result.message || t('library.folderCreateFailed', 'Failed to create folder'));
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(t('library.folderCreateFailed', 'Failed to create folder'));
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleEditFolder = async () => {
    if (!editingFolderName.trim()) {
      toast.error(t('library.folderNameRequired', 'Folder name is required'));
      return;
    }

    try {
      setUpdatingFolder(true);
      const response = await fetch(`/api/library/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingFolderName.trim()
        })
      });

      const result = await response.json();
      
      if (result.status) {
        toast.success(t('library.folderUpdated', 'Folder updated successfully'));
        setEditingFolder(null);
        setEditingFolderName("");
        
        // Refresh folders list based on current view mode
        const resourceType = getResourceType();
        if (folderViewMode === 'tree') {
          // Refresh tree structure
          const treeUrl = `/api/library/folders?resourceType=${resourceType}&tree=true`;
          const treeResponse = await fetch(treeUrl);
          const treeResult = await treeResponse.json();
          if (treeResult.status) {
            setFolderTree(treeResult.folders || []);
          }
        } else {
          // Refresh current level
          const parentId = currentFolderId || null;
          const url = `/api/library/folders?resourceType=${resourceType}&parentFolderId=${parentId || 'null'}`;
          const foldersResponse = await fetch(url);
          const foldersResult = await foldersResponse.json();
          if (foldersResult.status) {
            setFolders(foldersResult.folders || []);
          }
        }
      } else {
        toast.error(result.message || t('library.folderUpdateFailed', 'Failed to update folder'));
      }
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error(t('library.folderUpdateFailed', 'Failed to update folder'));
    } finally {
      setUpdatingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolderId) return;

    try {
      setDeletingFolder(true);
      const response = await fetch(`/api/library/folders/${deletingFolderId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.status) {
        toast.success(t('library.folderDeleted', 'Folder deleted successfully'));
        setDeletingFolderId(null);
        
        // Refresh folders list based on current view mode
        const resourceType = getResourceType();
        if (folderViewMode === 'tree') {
          // Refresh tree structure
          const treeUrl = `/api/library/folders?resourceType=${resourceType}&tree=true`;
          const treeResponse = await fetch(treeUrl);
          const treeResult = await treeResponse.json();
          if (treeResult.status) {
            setFolderTree(treeResult.folders || []);
          }
        } else {
          // Refresh current level
          const parentId = currentFolderId || null;
          const url = `/api/library/folders?resourceType=${resourceType}&parentFolderId=${parentId || 'null'}`;
          const foldersResponse = await fetch(url);
          const foldersResult = await foldersResponse.json();
          if (foldersResult.status) {
            setFolders(foldersResult.folders || []);
          }
        }
        
        // Refresh items
        const folderParam = currentFolderId ? `&folderId=${currentFolderId}` : '&folderId=null';
        const itemsResponse = await fetch(`/api/library/${category}?${folderParam}`);
        const itemsResult = await itemsResponse.json();
        if (itemsResult.status) {
          const itemsKey = category === 'articles' ? 'articles' : category;
          const fetchedItems = itemsResult[itemsKey] || [];
          setItems(fetchedItems.filter(item => item.id));
        }
      } else {
        toast.error(result.message || t('library.folderDeleteFailed', 'Failed to delete folder'));
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(t('library.folderDeleteFailed', 'Failed to delete folder'));
    } finally {
      setDeletingFolder(false);
    }
  };

  const handleFolderClick = (folderId) => {
    if (folderViewMode === 'tree') {
      // In tree view, toggle expand/collapse instead of navigating
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) {
          newSet.delete(folderId);
        } else {
          newSet.add(folderId);
        }
        return newSet;
      });
    } else {
      // In current view, navigate into folder
      setCurrentFolderId(folderId);
      setSelectedFiles([]);
    }
  };

  const handleFolderNavigate = (folderId) => {
    // Navigate into folder (used in tree view)
    setCurrentFolderId(folderId);
    setSelectedFiles([]);
    setFolderViewMode('current'); // Switch back to current view when navigating
  };

  const toggleExpandFolder = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleBreadcrumbClick = (folderId) => {
    setCurrentFolderId(folderId);
    setSelectedFiles([]);
  };

  // Cut files (mark for moving)
  const handleCutFiles = () => {
    if (selectedFiles.length === 0) {
      toast.error(t('library.noFilesSelected', 'Please select files to move'));
      return;
    }
    setCutFiles(selectedFiles);
    const count = selectedFiles.length;
    const fileText = count === 1 ? 'file' : 'files';
    toast.info(`${count} ${fileText} cut. Navigate to destination and click Paste Here.`);
  };

  // Cancel cut operation
  const handleCancelCut = () => {
    setCutFiles([]);
    toast.info(t('library.cutCancelled', 'Cut operation cancelled'));
  };

  // Paste files to current folder
  const handlePasteFiles = async (targetFolderId = null) => {
    if (cutFiles.length === 0) {
      toast.error(t('library.noFilesCut', 'No files are cut'));
      return;
    }

    try {
      setMovingFiles(true);
      const response = await fetch('/api/library/resources/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceIds: cutFiles,
          folderId: targetFolderId || currentFolderId || null
        })
      });

      const result = await response.json();
      
      if (result.status) {
        const count = cutFiles.length;
        const fileText = count === 1 ? 'file' : 'files';
        toast.success(`${count} ${fileText} moved successfully`);
        setCutFiles([]);
        setSelectedFiles([]);
        
        // Refresh items list
        const folderParam = currentFolderId ? `&folderId=${currentFolderId}` : '&folderId=null';
        const itemsResponse = await fetch(`/api/library/${category}?${folderParam}`);
        const itemsResult = await itemsResponse.json();
        if (itemsResult.status) {
          const itemsKey = category === 'articles' ? 'articles' : category;
          const fetchedItems = itemsResult[itemsKey] || [];
          setItems(fetchedItems.filter(item => item.id));
        }
      } else {
        toast.error(result.message || t('library.moveFailed', 'Failed to move files'));
      }
    } catch (error) {
      console.error('Error moving files:', error);
      toast.error(t('library.moveFailed', 'Failed to move files'));
    } finally {
      setMovingFiles(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, fileIds) => {
    setIsDragging(true);
    setDraggedFiles(fileIds);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(fileIds));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedFiles([]);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    setDragOverFolderId(null);
    
    let filesToMove = draggedFiles;
    
    // If no dragged files, try to get from dataTransfer
    if (filesToMove.length === 0) {
      try {
        const data = e.dataTransfer.getData('text/plain');
        filesToMove = JSON.parse(data);
      } catch (error) {
        console.error('Error parsing drag data:', error);
        return;
      }
    }

    if (filesToMove.length === 0) {
      return;
    }

    try {
      setMovingFiles(true);
      const response = await fetch('/api/library/resources/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceIds: filesToMove,
          folderId: targetFolderId || null
        })
      });

      const result = await response.json();
      
      if (result.status) {
        const count = filesToMove.length;
        const fileText = count === 1 ? 'file' : 'files';
        toast.success(`${count} ${fileText} moved successfully`);
        setSelectedFiles([]);
        setCutFiles([]);
        
        // Refresh items list
        const folderParam = currentFolderId ? `&folderId=${currentFolderId}` : '&folderId=null';
        const itemsResponse = await fetch(`/api/library/${category}?${folderParam}`);
        const itemsResult = await itemsResponse.json();
        if (itemsResult.status) {
          const itemsKey = category === 'articles' ? 'articles' : category;
          const fetchedItems = itemsResult[itemsKey] || [];
          setItems(fetchedItems.filter(item => item.id));
        }
      } else {
        toast.error(result.message || t('library.moveFailed', 'Failed to move files'));
      }
    } catch (error) {
      console.error('Error moving files:', error);
      toast.error(t('library.moveFailed', 'Failed to move files'));
    } finally {
      setMovingFiles(false);
      setIsDragging(false);
      setDraggedFiles([]);
    }
  };

  const handleDownload = async (item) => {
    try {
      setDownloadingItemId(item.id);
      
      // Use fileName if available, otherwise fall back to title with proper extension
      const filename = item.fileName || item.title || 'download';
      
      const response = await fetch(`/api/library/download?path=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(filename)}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.title;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(t('library.downloadStarted', 'Download started'));
      } else {
        const errorData = await response.json();
        console.error('Download failed:', errorData);
        toast.error(t('library.downloadFailed', 'Download failed') + (errorData.message ? `: ${errorData.message}` : ''));
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('library.downloadFailed', 'Download failed'));
    } finally {
      setDownloadingItemId(null);
    }
  };
  
  if (!categoryInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('library.categoryNotFound')}</p>
      </div>
    );
  }

  const IconComponent = categoryInfo.icon;

  return (
    <div className={`space-y-6 ${isMobile ? 'px-4 pb-24' : ''}`}>
      {/* Page Header */}
      <div className={`flex items-center ${isMobile ? 'flex-col gap-3' : 'justify-between'}`}>
        <div className={`flex items-center ${isMobile ? 'w-full' : 'gap-4'}`}>
          <Button 
            variant="ghost" 
            size={isMobile ? "sm" : "sm"}
            onClick={() => router.push('/coach/library')}
            className={isMobile ? 'p-1.5 h-8 w-8' : 'p-2'}
          >
            <ArrowLeft className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
          </Button>
          <div className={`flex items-center ${isMobile ? 'gap-2 flex-1' : 'gap-3'}`}>
            <div className={`${categoryInfo.color} rounded-lg ${isMobile ? 'p-1.5' : 'p-2'}`}>
              <IconComponent className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} text-white`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`${isMobile ? 'text-lg' : 'text-3xl'} font-bold text-foreground`}>{categoryInfo.title}</h2>
              <p className={`text-muted-foreground ${isMobile ? 'text-xs' : ''}`}>
                {loading ? t('common.messages.loading') : `${items.length} ${items.length === 1 ? 'item' : 'items'} available`}
                {selectedFiles.length > 0 && ` • ${selectedFiles.length} selected`}
              </p>
            </div>
          </div>
        </div>
        
        <div className={`flex items-center ${isMobile ? 'w-full gap-1 flex-wrap' : 'gap-2'}`}>
          <FileUploadDialog
            category={category || ""}
            currentFolderId={currentFolderId}
            onUploadComplete={handleFileUpload}
          >
            <Button variant="outline" className={`flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8 flex-1' : 'gap-2'}`} size={isMobile ? "sm" : "default"}>
              <Upload className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
              {t('library.uploadFile', 'Upload')}
            </Button>
          </FileUploadDialog>
          
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value)}
            className={`border rounded-lg ${isMobile ? 'p-0.5' : ''}`}
          >
            <ToggleGroupItem value="grid" aria-label={t('library.gridView')} className={isMobile ? 'h-8 w-8 p-0' : ''}>
              <Grid3X3 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label={t('library.listView')} className={isMobile ? 'h-8 w-8 p-0' : ''}>
              <List className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            </ToggleGroupItem>
          </ToggleGroup>
          
          <Button 
            variant="outline" 
            onClick={handleSelectAll}
            className={`flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8' : 'gap-2'}`}
            size={isMobile ? "sm" : "default"}
          >
            {selectedFiles.length === items.length ? (
              <>
                <CheckSquare className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                {!isMobile && t('library.deselectAll', 'Deselect All')}
              </>
            ) : (
              <>
                <Square className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                {!isMobile && t('library.selectAll', 'Select All')}
              </>
            )}
          </Button>
          
          {selectedFiles.length > 0 && (
            <>
              {cutFiles.length > 0 ? (
                <Button 
                  variant="outline"
                  onClick={handleCancelCut}
                  className={`flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8 flex-1' : 'gap-2'}`}
                  size={isMobile ? "sm" : "default"}
                >
                  <XIcon className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                  {isMobile ? `Cancel (${cutFiles.length})` : `${t('library.cancelCut', 'Cancel Cut')} (${cutFiles.length})`}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={handleCutFiles}
                  className={`flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8 flex-1' : 'gap-2'}`}
                  size={isMobile ? "sm" : "default"}
                >
                  <Scissors className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                  {isMobile ? `Cut (${selectedFiles.length})` : `${t('library.cut', 'Cut')} (${selectedFiles.length})`}
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={handleDeleteSelectedFiles}
                disabled={deletingFiles}
                className={`flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8 flex-1' : 'gap-2'} text-destructive hover:text-destructive`}
                size={isMobile ? "sm" : "default"}
              >
                {deletingFiles ? (
                  <>
                    <Loader2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`} />
                    {isMobile ? 'Deleting...' : t('common.messages.deleting', 'Deleting...')}
                  </>
                ) : (
                  <>
                    <Trash2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                    {isMobile ? `Delete (${selectedFiles.length})` : `${t('common.buttons.delete', 'Delete')} (${selectedFiles.length})`}
                  </>
                )}
              </Button>
              
              <ShareFileDialog 
                files={getSelectedFiles()}
                onShare={handleShareSelected}
              >
                <Button className={`flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8 flex-1' : 'gap-2'}`} size={isMobile ? "sm" : "default"}>
                  <Share2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                  {isMobile ? `Share (${selectedFiles.length})` : `${t('library.shareSelected', 'Share Selected')} (${selectedFiles.length})`}
                </Button>
              </ShareFileDialog>
            </>
          )}

          {/* Paste Here button - shows when files are cut */}
          {cutFiles.length > 0 && (
            <Button 
              onClick={() => handlePasteFiles()}
              disabled={movingFiles}
              className={`flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8 flex-1' : 'gap-2'} bg-primary`}
              size={isMobile ? "sm" : "default"}
            >
              {movingFiles ? (
                <>
                  <Loader2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`} />
                  {isMobile ? 'Moving...' : t('common.messages.moving', 'Moving...')}
                </>
              ) : (
                <>
                  <Clipboard className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                  {isMobile ? `Paste (${cutFiles.length})` : `${t('library.pasteHere', 'Paste Here')} (${cutFiles.length})`}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div 
        className={`flex items-center gap-2 ${isMobile ? 'flex-wrap text-xs' : 'text-sm'} text-muted-foreground ${
          dragOverFolderId === 'root' ? 'bg-primary/10 p-2 rounded-lg border-2 border-primary' : ''
        }`}
        onDragOver={(e) => {
          if (isDragging) {
            e.preventDefault();
            setDragOverFolderId('root');
          }
        }}
        onDragLeave={() => setDragOverFolderId(null)}
        onDrop={(e) => handleDrop(e, null)}
      >
        <button
          onClick={() => {
            setCurrentFolderId(null);
            setSelectedFiles([]);
            // Keep cut files - user might want to paste in root
          }}
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          {categoryInfo.title}
        </button>
        {folderPath.map((folder, index) => {
          const isLast = index === folderPath.length - 1;
          return (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3" />
              {isLast ? (
                <span className="text-foreground font-medium">
                  {folder.name}
                </span>
              ) : (
                <button
                  onClick={() => handleBreadcrumbClick(folder.id)}
                  className="hover:text-foreground transition-colors"
                >
                  {folder.name}
                </button>
              )}
            </div>
          );
        })}
        {cutFiles.length > 0 && dragOverFolderId === 'root' && (
          <span className="text-primary font-medium ml-2">
            {t('library.dropHere', 'Drop here to move to root')}
          </span>
        )}
      </div>

      {/* Folders Section */}
      {!loadingFolders && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-foreground`}>
                {t('library.folders', 'Folders')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFolderViewMode(folderViewMode === 'current' ? 'tree' : 'current')}
                className={`flex items-center gap-1 ${isMobile ? 'text-xs px-1.5 h-7' : 'text-xs px-2 h-8'}`}
              >
                <Layers className={isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                {folderViewMode === 'current' ? t('library.treeView', 'Tree') : t('library.currentView', 'Current')}
              </Button>
            </div>
            <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size={isMobile ? "sm" : "sm"}
                  className={`flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8' : 'gap-2'}`}
                >
                  <FolderPlus className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                  {!isMobile && t('library.createFolder', 'New Folder')}
                </Button>
              </DialogTrigger>
              <DialogContent className={isMobile ? 'w-[90vw]' : ''}>
                <DialogHeader>
                  <DialogTitle>{t('library.createFolder', 'Create New Folder')}</DialogTitle>
                  <DialogDescription>
                    {t('library.createFolderDesc', 'Organize your files by creating folders')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="folderName">{t('library.folderName', 'Folder Name')}</Label>
                    <Input
                      id="folderName"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder={t('library.folderNamePlaceholder', 'Enter folder name')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !creatingFolder) {
                          handleCreateFolder();
                        }
                      }}
                    />
                  </div>
                  {folderViewMode === 'tree' && (
                    <div className="space-y-2">
                      <Label>{t('library.parentFolder', 'Parent Folder')}</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 border rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground">
                            {newFolderParentId ? (() => {
                              const selectedPath = getFolderPathFromTree(newFolderParentId);
                              if (selectedPath.length > 0) {
                                return `${categoryInfo.title} / ${selectedPath.map(f => f.name).join(' / ')}`;
                              }
                              return categoryInfo.title;
                            })() : (
                              `${categoryInfo.title} (Root)`
                            )}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTreePicker(true)}
                        >
                          {t('library.changeLocation', 'Change')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateFolderDialog(false);
                      setNewFolderName("");
                      setNewFolderParentId(currentFolderId);
                    }}
                  >
                    {t('common.buttons.cancel', 'Cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateFolder}
                    disabled={creatingFolder || !newFolderName.trim()}
                  >
                    {creatingFolder ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.messages.creating', 'Creating...')}
                      </>
                    ) : (
                      t('common.buttons.create', 'Create')
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Tree Picker Dialog for Folder Creation */}
            <TreePickerDialog
              open={showTreePicker}
              onOpenChange={setShowTreePicker}
              folders={folderTree}
              selectedFolderId={newFolderParentId}
              onSelect={(folderId) => {
                setNewFolderParentId(folderId);
                setShowTreePicker(false);
              }}
              title={t('library.selectParentFolder', 'Select Parent Folder')}
              allowRoot={true}
              categoryInfo={categoryInfo}
            />
          </div>
          
          {/* Render folders based on view mode */}
          {folderViewMode === 'tree' ? (
            // Tree View
            <div className="space-y-1">
              {folderTree.length > 0 ? (
                folderTree.map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    depth={0}
                    expandedFolders={expandedFolders}
                    onToggleExpand={toggleExpandFolder}
                    onNavigate={handleFolderNavigate}
                    onEdit={(folder) => {
                      setEditingFolder(folder);
                      setEditingFolderName(folder.name);
                    }}
                    onDelete={(folderId) => setDeletingFolderId(folderId)}
                    onPaste={handlePasteFiles}
                    cutFiles={cutFiles}
                    movingFiles={movingFiles}
                    dragOverFolderId={dragOverFolderId}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    categoryInfo={categoryInfo}
                    isMobile={isMobile}
                    t={t}
                  />
                ))
              ) : (
                <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'} py-4`}>
                  {t('library.noFolders', 'No folders yet. Create one to organize your files.')}
                </p>
              )}
            </div>
          ) : folders.length > 0 ? (
            // Current Level View (Grid)
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'}`}>
              {folders.map((folder) => (
                <Card
                  key={folder.id}
                  className={`group hover:shadow-medium transition-all cursor-pointer border-2 hover:border-primary/50 ${
                    dragOverFolderId === folder.id ? 'border-primary border-4 bg-primary/10' : ''
                  }`}
                  onClick={() => handleFolderClick(folder.id)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                >
                  <CardContent className={`p-4 ${isMobile ? 'p-3' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`${categoryInfo.color} rounded-lg p-2 shrink-0`}>
                          <Folder className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <h4 className={`font-medium text-foreground truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                  {folder.name}
                                </h4>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{folder.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {cutFiles.length > 0 && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePasteFiles(folder.id);
                            }}
                            disabled={movingFiles}
                            className="opacity-100"
                          >
                            {movingFiles ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              t('library.moveHere', 'Move Here')
                            )}
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // Use requestAnimationFrame to ensure dropdown closes first
                                requestAnimationFrame(() => {
                                  setEditingFolder(folder);
                                  setEditingFolderName(folder.name);
                                });
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              {t('common.buttons.edit', 'Edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // Use requestAnimationFrame to ensure dropdown closes first
                                requestAnimationFrame(() => {
                                  setDeletingFolderId(folder.id);
                                });
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('common.buttons.delete', 'Delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            !loading && folderViewMode === 'current' && (
              <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'} py-4`}>
                {t('library.noFolders', 'No folders yet. Create one to organize your files.')}
              </p>
            )
          )}
        </div>
      )}

      {/* Files Section Header */}
      {!loading && folders.length > 0 && (
        <div className="pt-4">
          <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-foreground mb-2`}>
            {t('library.files', 'Files')}
          </h3>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('library.loading', 'Loading')} {categoryInfo.title.toLowerCase()}...</p>
          </div>
        </div>
      )}

      {/* Items Display */}
      {!loading && (
        <>
        {viewMode === 'grid' && (
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
              {items.map((item, index) => (
            <Card 
              key={item.id || `item-${index}`}
              draggable={selectedFiles.includes(item.id) && selectedFiles.length > 0}
              onDragStart={(e) => {
                if (selectedFiles.includes(item.id)) {
                  handleDragStart(e, selectedFiles);
                }
              }}
              onDragEnd={handleDragEnd}
              className={`shadow-soft border-border bg-card hover:shadow-medium transition-all group flex flex-col cursor-pointer ${
                selectedFiles.includes(item.id) ? 'ring-2 ring-primary' : ''
              } ${
                cutFiles.includes(item.id) ? 'border-dashed border-2 border-primary opacity-75' : ''
              } ${isMobile ? 'p-3' : ''}`}
              onClick={() => handleFileToggle(item.id)}
            >
              <CardHeader className={`pb-4 ${isMobile ? 'pb-3 px-0' : ''}`}>
                <CardTitle className={`text-foreground flex items-start justify-between gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2'} min-w-0 flex-1`}>
                    <Checkbox
                      checked={selectedFiles.includes(item.id)}
                      onCheckedChange={() => handleFileToggle(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-1 shrink-0 ${isMobile ? 'h-4 w-4' : ''}`}
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`truncate ${isMobile ? 'text-xs' : 'text-sm'} font-medium cursor-help`}>{item.title}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {/* <Badge variant="outline" className="shrink-0 text-xs">
                    {item.format}
                  </Badge> */}
                </CardTitle>
              </CardHeader>
              
              <CardContent className={`flex-1 flex flex-col ${isMobile ? 'px-0' : ''}`}>
                {/* Top content */}
                <div className="flex-1">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground line-clamp-2 ${isMobile ? 'mb-2' : 'mb-4'}`}>
                    {item.description}
                  </p>

                  {/* Item Details */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {item.size && <div>{t('library.size', 'Size')}: {item.size}</div>}
                    {item.duration && <div>{t('library.duration', 'Duration')}: {item.duration}</div>}
                    {item.pages && <div>{t('library.pages', 'Pages')}: {item.pages}</div>}
                    {item.author && <div>{t('library.author', 'Author')}: {item.author}</div>}
                    {item.dimensions && <div>{t('library.dimensions', 'Dimensions')}: {item.dimensions}</div>}
                    {item.sessions && <div>{t('library.sessions', 'Sessions')}: {item.sessions}</div>}
                    {item.level && <div>{t('library.level', 'Level')}: {item.level}</div>}
                  </div>
                </div>

                {/* Preview Area - positioned above buttons */}
                <div 
                  className="bg-muted/30 rounded-lg p-4 h-32 flex items-center justify-center mb-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handlePreview(item)}
                >
                  {item.url ? (
                    <div className="w-full h-full flex items-center justify-center">
                      {category === 'images' ? (
                        <img 
                          src={`/api/library/preview?path=${encodeURIComponent(item.url)}`}
                          alt={item.title}
                          className="max-w-full max-h-full object-contain rounded"
                          onError={(e) => {
                            console.error('❌ Card image failed to load:', item.url);
                            e.target.style.display = 'none';
                            // Show fallback text
                            const fallback = document.createElement('div');
                            fallback.className = 'text-gray-500 text-sm text-center p-4';
                            fallback.textContent = item.title || 'Image preview unavailable';
                            e.target.parentNode.appendChild(fallback);
                          }}
                        />
                      ) : category === 'videos' ? (
                        <video 
                          src={`/api/library/preview?path=${encodeURIComponent(item.url)}`}
                          className="max-w-full max-h-full object-contain rounded"
                          controls={false}
                          onError={(e) => {
                            console.error('❌ Card video failed to load:', item.url);
                            e.target.style.display = 'none';
                            // Show fallback text
                            const fallback = document.createElement('div');
                            fallback.className = 'text-gray-500 text-sm text-center p-4';
                            fallback.textContent = item.title || 'Video preview unavailable';
                            e.target.parentNode.appendChild(fallback);
                          }}
                        />
                      ) : category === 'articles' ? (
                        <div className="text-center space-y-2">
                          <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-xs text-muted-foreground">{t('library.clickToPreview', 'Click to preview')}</p>
                          <p className="text-xs text-muted-foreground/70">PDF/{t('common.labels.document', 'Document')}</p>
                        </div>
                      ) : category === 'sounds' ? (
                        <div className="text-center space-y-2">
                          <Music className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-xs text-muted-foreground">{t('library.clickToPreview', 'Click to preview')}</p>
                          <p className="text-xs text-muted-foreground/70">{t('library.audio', 'Audio')}</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <IconComponent className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-xs text-muted-foreground">{t('library.clickToPreview', 'Click to preview')}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                  <div className="text-center space-y-2">
                    <IconComponent className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">{t('library.noPreviewAvailable', 'No preview available')}</p>
                  </div>
                  )}
                </div>

                {/* Action Buttons - Only icons */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    title={t('library.preview', 'Preview')} 
                    className="px-3"
                    onClick={() => handlePreview(item)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    title={t('library.download', 'Download')} 
                    className="px-3"
                    disabled={downloadingItemId === item.id}
                    onClick={() => handleDownload(item)}
                  >
                    {downloadingItemId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  <ShareFileDialog
                    file={item}
                    onShare={(shareData) => handleFileShare(item, shareData)}
                  >
                    <Button size="sm" className="px-3 bg-primary hover:bg-primary/90" title={t('library.share', 'Share')}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </ShareFileDialog>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    title={t('common.buttons.delete', 'Delete')} 
                    className="px-3 text-destructive hover:text-destructive"
                    disabled={deletingFileId === item.id}
                    onClick={() => handleDeleteFile(item.id)}
                  >
                    {deletingFileId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {viewMode === 'list' && (
        <div className="space-y-2">
              {items.map((item, index) => (
            <Card 
              key={item.id || `item-${index}`}
              draggable={selectedFiles.includes(item.id) && selectedFiles.length > 0}
              onDragStart={(e) => {
                if (selectedFiles.includes(item.id)) {
                  handleDragStart(e, selectedFiles);
                }
              }}
              onDragEnd={handleDragEnd}
              className={`shadow-soft border-border bg-card hover:shadow-medium transition-all cursor-pointer ${
                selectedFiles.includes(item.id) ? 'ring-2 ring-primary' : ''
              } ${
                cutFiles.includes(item.id) ? 'border-dashed border-2 border-primary opacity-75' : ''
              }`}
              onClick={() => handleFileToggle(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={selectedFiles.includes(item.id)}
                      onCheckedChange={() => handleFileToggle(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-3">
                      <div className={`${categoryInfo.color} rounded-md p-2`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <h4 className="font-medium text-foreground truncate cursor-help">{item.title}</h4>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{item.title}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {item.format}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-muted-foreground space-y-1">
                      {item.size && <div>{t('library.size', 'Size')}: {item.size}</div>}
                      {item.duration && <div>{t('library.duration', 'Duration')}: {item.duration}</div>}
                      {item.pages && <div>{t('library.pages', 'Pages')}: {item.pages}</div>}
                      {item.author && <div>{t('library.author', 'Author')}: {item.author}</div>}
                      {item.dimensions && <div>{t('library.dimensions', 'Dimensions')}: {item.dimensions}</div>}
                      {item.sessions && <div>{t('library.sessions', 'Sessions')}: {item.sessions}</div>}
                      {item.level && <div>{t('library.level', 'Level')}: {item.level}</div>}
                    </div>
                    
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        title={t('library.preview', 'Preview')} 
                        className="px-3"
                        onClick={() => handlePreview(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        title={t('library.download', 'Download')} 
                        className="px-3"
                        disabled={downloadingItemId === item.id}
                        onClick={() => handleDownload(item)}
                      >
                        {downloadingItemId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <ShareFileDialog
                        file={item}
                        onShare={(shareData) => handleFileShare(item, shareData)}
                      >
                        <Button size="sm" className="px-3 bg-primary hover:bg-primary/90" title={t('library.share', 'Share')}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </ShareFileDialog>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        title={t('common.buttons.delete', 'Delete')} 
                        className="px-3 text-destructive hover:text-destructive"
                        disabled={deletingFileId === item.id}
                        onClick={() => handleDeleteFile(item.id)}
                      >
                        {deletingFileId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Preview</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setPreviewUrl(null);
                  setPreviewType(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              {previewType === 'images' ? (
                <div>
                  <img 
                    src={`/api/library/preview?path=${encodeURIComponent(previewUrl)}`}
                    alt="Preview"
                    className="max-w-full max-h-[70vh] object-contain mx-auto"
                    onLoad={(e) => {
                      console.log('✅ Image loaded successfully via API');
                      console.log('Image dimensions:', e.target.naturalWidth, 'x', e.target.naturalHeight);
                    }}
                    onError={(e) => {
                      console.error('❌ API image failed to load');
                      e.target.style.display = 'none';
                      // Show fallback message
                      const fallback = document.createElement('div');
                      fallback.className = 'text-center py-8';
                      fallback.innerHTML = `
                        <p class="text-muted-foreground mb-4">Preview failed to load</p>
                        <p class="text-xs text-red-500 mb-2">URL: ${previewUrl}</p>
                        <button 
                          class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          onclick="window.open('${previewUrl}', '_blank')"
                        >
                          Open in New Tab
                        </button>
                      `;
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />
                </div>
              ) : previewType === 'videos' ? (
                <video 
                  src={`/api/library/preview?path=${encodeURIComponent(previewUrl)}`}
                  controls
                  className="max-w-full max-h-[70vh] mx-auto"
                  onLoadStart={() => {
                    console.log('✅ Video started loading via API');
                  }}
                  onError={(e) => {
                    console.error('❌ API video failed to load');
                    e.target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'text-center py-8';
                    fallback.innerHTML = `
                      <p class="text-muted-foreground mb-4">Video failed to load</p>
                      <p class="text-xs text-red-500 mb-2">URL: ${previewUrl}</p>
                      <button 
                        class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        onclick="window.open('${previewUrl}', '_blank')"
                      >
                        Open in New Tab
                      </button>
                    `;
                    e.target.parentNode.appendChild(fallback);
                  }}
                />
              ) : previewType === 'sounds' ? (
                <audio 
                  src={previewUrl}
                  controls
                  className="w-full"
                  preload="metadata"
                  onLoadStart={() => {
                    console.log('✅ Audio started loading directly from:', previewUrl);
                  }}
                  onCanPlay={() => {
                    console.log('✅ Audio can play');
                  }}
                  onLoadedData={() => {
                    console.log('✅ Audio data loaded');
                  }}
                  onLoadedMetadata={() => {
                    console.log('✅ Audio metadata loaded');
                  }}
                  onError={(e) => {
                    console.error('❌ Direct audio failed to load, trying preview API');
                    // Try the preview API as fallback
                    e.target.src = `/api/library/preview?path=${encodeURIComponent(previewUrl)}`;
                    e.target.onerror = (fallbackError) => {
                      console.error('❌ Preview API audio also failed to load');
                      e.target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'text-center py-8';
                      fallback.innerHTML = `
                        <p class="text-muted-foreground mb-4">Audio failed to load</p>
                        <p class="text-xs text-red-500 mb-2">Direct URL: ${previewUrl}</p>
                        <p class="text-xs text-red-500 mb-2">Preview API: /api/library/preview?path=${encodeURIComponent(previewUrl)}</p>
                        <button 
                          class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          onclick="window.open('${previewUrl}', '_blank')"
                        >
                          Open in New Tab
                        </button>
                      `;
                      e.target.parentNode.appendChild(fallback);
                    };
                  }}
                />
              ) : previewType === 'pdf' ? (
                <div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">{t('library.pdfPreview', 'PDF Preview')}</h4>
                    <iframe
                      src={`/api/library/preview?path=${encodeURIComponent(previewUrl)}`}
                      className="w-full h-[60vh] border rounded"
                      title={t('library.pdfPreview', 'PDF Preview')}
                      onLoad={() => {
                        console.log('✅ PDF loaded successfully via API');
                      }}
                      onError={() => {
                        console.error('❌ PDF failed to load via API');
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        const apiUrl = `/api/library/preview?path=${encodeURIComponent(previewUrl)}`;
                        window.open(apiUrl, '_blank');
                      }}
                    >
                      {t('common.buttons.openInNewTab', 'Open in New Tab')}
                    </Button>
                  </div>
                </div>
              ) : previewType === 'document' ? (
                <div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">{t('library.documentPreview', 'Document Preview')}</h4>
                    <div className="w-full h-[60vh] border rounded bg-gray-50 flex items-center justify-center">
                      <div className="text-center p-8">
                        <div className="mb-4">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('library.documentPreview', 'Document Preview')}</h3>
                        <p className="text-sm text-gray-500 mb-6">
                          {t('library.documentPreviewUnavailable', 'This document type cannot be previewed directly in the browser. Please download the file to view it in a compatible application.')}
                        </p>
                        <div className="space-y-3">
                          <Button 
                            variant="default" 
                            className="w-full"
                            onClick={() => {
                              // Force download
                              const link = document.createElement('a');
                              link.href = `/api/library/preview?path=${encodeURIComponent(previewUrl)}`;
                              link.download = previewUrl.split('/').pop() || 'document';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            {t('library.downloadDocument', 'Download Document')}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => {
                              const apiUrl = `/api/library/preview?path=${encodeURIComponent(previewUrl)}`;
                              window.open(apiUrl, '_blank');
                            }}
                          >
                            {t('common.buttons.openInNewTab', 'Open in New Tab')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">{t('library.documentPreview', 'Document Preview')}</h4>
                    <iframe
                      src={`/api/library/preview?path=${encodeURIComponent(previewUrl)}`}
                      className="w-full h-[60vh] border rounded"
                      title={t('library.documentPreview', 'Document Preview')}
                      onLoad={() => {
                        console.log('✅ Document loaded successfully via API');
                      }}
                      onError={() => {
                        console.error('❌ Document failed to load via API');
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        const apiUrl = `/api/library/preview?path=${encodeURIComponent(previewUrl)}`;
                        window.open(apiUrl, '_blank');
                      }}
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Folder Dialog */}
      {editingFolder && (
        <Dialog open={!!editingFolder} onOpenChange={(open) => !open && setEditingFolder(null)}>
          <DialogContent className={isMobile ? 'w-[90vw]' : ''}>
            <DialogHeader>
              <DialogTitle>{t('library.editFolder', 'Edit Folder')}</DialogTitle>
              <DialogDescription>
                {t('library.editFolderDesc', 'Update the folder name')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editFolderName">{t('library.folderName', 'Folder Name')}</Label>
                <Input
                  id="editFolderName"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  placeholder={t('library.folderNamePlaceholder', 'Enter folder name')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEditFolder();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingFolder(null);
                  setEditingFolderName("");
                }}
                disabled={updatingFolder}
              >
                {t('common.buttons.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleEditFolder}
                disabled={!editingFolderName.trim() || updatingFolder}
              >
                {updatingFolder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.messages.saving', 'Saving...')}
                  </>
                ) : (
                  t('common.buttons.save', 'Save')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Folder Confirmation Dialog */}
      <AlertDialog open={!!deletingFolderId} onOpenChange={(open) => !open && setDeletingFolderId(null)}>
        <AlertDialogContent className={isMobile ? 'w-[90vw]' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('library.deleteFolder', 'Delete Folder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('library.deleteFolderDesc', 'Are you sure you want to delete this folder? All files in this folder will be permanently deleted from both database and storage. This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingFolder}>
              {t('common.buttons.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              disabled={deletingFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingFolder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.messages.deleting', 'Deleting...')}
                </>
              ) : (
                t('common.buttons.delete', 'Delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}