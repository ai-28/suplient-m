"use client"
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { 
  File,
  Image as ImageIcon,
  FileText,
  Video,
  Plus,
  Eye,
  Minus,
  Loader2
} from "lucide-react";
import { LibraryPickerModal } from "./LibraryPickerModal";


export function GroupFilesPanel({ groupId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [fileToRemove, setFileToRemove] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Preview states
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);

  // Mobile detection
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 640);
      }
    };

    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  const fetchGroupResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/resources/group/${groupId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch group resources');
      }
      const result = await response.json();
      setFiles(result.resources || []);
    } catch (err) {
      console.error('Error fetching group resources:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroupResources();
    }
  }, [groupId]);

  const handleShareFiles = async (selectedFiles) => {
    try {
      // Share each selected file with the group
      for (const file of selectedFiles) {
        const response = await fetch('/api/resources/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resourceId: file.id,
            groupIds: [groupId]
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to share ${file.name}`);
        }
      }

      // Refresh the files list
      await fetchGroupResources();
    } catch (error) {
      console.error('Error sharing files:', error);
      alert(`Error sharing files: ${error.message}`);
    }
  };

  const handleViewFile = (file) => {
    
    const directUrl = file.url;
    
    // Determine file type based on resourceType or file extension
    const fileName = file.fileName || file.url.split('/').pop() || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    // Set preview type based on resourceType or file extension
    if (file.resourceType === 'image' || fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png' || fileExtension === 'gif' || fileExtension === 'webp') {
      setPreviewType('images');
    } else if (file.resourceType === 'video' || fileExtension === 'mp4' || fileExtension === 'avi' || fileExtension === 'mov' || fileExtension === 'wmv') {
      setPreviewType('videos');
    } else if (file.resourceType === 'sound' || fileExtension === 'mp3' || fileExtension === 'wav' || fileExtension === 'ogg' || fileExtension === 'm4a') {
      setPreviewType('sounds');
    } else if (fileExtension === 'pdf') {
      setPreviewType('pdf');
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(fileExtension)) {
      setPreviewType('document');
    } else {
      setPreviewType('document'); // Default fallback
    }
    
    setPreviewUrl(directUrl);
  };

  const handleRemoveFileClick = (file) => {
    setFileToRemove(file);
  };

  const handleConfirmRemove = async () => {
    if (fileToRemove) {
      try {
        const response = await fetch('/api/resources/remove-group', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resourceId: fileToRemove.id,
            groupId: groupId
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to remove file from group');
        }

        // Refresh the files list
        await fetchGroupResources();
        setFileToRemove(null);
      } catch (error) {
        console.error('Error removing file:', error);
        alert(`Error removing file: ${error.message}`);
      }
    }
  };

  const getFileIcon = (type) => {
    switch (type.toLowerCase()) {
      case "pdf": return <FileText className="h-4 w-4 text-red-500" />;
      case "video": case "mp4": return <Video className="h-4 w-4 text-blue-500" />;
      case "image": case "jpg": case "png": return <ImageIcon className="h-4 w-4 text-green-500" />;
      case "doc": case "docx": return <FileText className="h-4 w-4 text-blue-600" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <>
      <Card className={`shadow-soft border-border bg-card h-full flex flex-col ${isMobile ? 'p-0 shadow-none border-0' : ''}`}>
        <CardHeader className={`${isMobile ? 'px-2 pb-2 pt-2' : 'pb-3'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <CardTitle className={`text-foreground ${isMobile ? 'text-xs' : 'text-sm'} break-words`}>Shared Files</CardTitle>
            <Button 
              size="sm" 
              variant="ghost"
              className={isMobile ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'}
              onClick={() => setLibraryPickerOpen(true)}
            >
              <Plus className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`flex-1 flex flex-col ${isMobile ? 'px-2 pb-2' : ''}`}>
          <ScrollArea className={`${isMobile ? 'h-[200px]' : 'h-[250px]'}`}>
            {loading ? (
              <div className={`flex items-center justify-center ${isMobile ? 'h-24' : 'h-32'}`}>
                <div className="text-center">
                  <Loader2 className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} animate-spin mx-auto mb-2`} />
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground break-words`}>Loading files...</p>
                </div>
              </div>
            ) : error ? (
              <div className={`flex items-center justify-center ${isMobile ? 'h-24' : 'h-32'}`}>
                <div className="text-center">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-destructive mb-2 break-words`}>Error: {error}</p>
                  <Button size={isMobile ? "sm" : "sm"} variant="outline" onClick={fetchGroupResources} className={isMobile ? 'text-xs h-7' : ''}>
                    Try Again
                  </Button>
                </div>
              </div>
            ) : files.length === 0 ? (
              <div className={`flex items-center justify-center ${isMobile ? 'h-24' : 'h-32'}`}>
                <div className="text-center">
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground break-words`}>No files shared yet</p>
                </div>
              </div>
            ) : (
              <div className={`${isMobile ? 'space-y-1.5 pr-2' : 'space-y-2 pr-4'}`}>
                {files.map((file) => (
                  <div key={file.id} className={`flex items-center justify-between ${isMobile ? 'p-1.5' : 'p-2'} rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={isMobile ? 'h-3 w-3' : ''}>
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium truncate break-words`}>{file.name}</p>
                        <p className={`${isMobile ? 'text-[9px]' : 'text-xs'} text-gray-500 break-words`}>{file.type} • {file.size}</p>
                        <p className={`${isMobile ? 'text-[9px]' : 'text-xs'} text-gray-500 break-words`}>Shared {file.sharedDate}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${isMobile ? 'ml-1' : 'ml-2'}`}>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={isMobile ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'}
                        onClick={() => handleViewFile(file)}
                        title="Preview file"
                      >
                        <Eye className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={`${isMobile ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'} text-red-500 hover:text-red-600`}
                        onClick={() => handleRemoveFileClick(file)}
                        title="Remove file"
                      >
                        <Minus className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <LibraryPickerModal
        open={libraryPickerOpen}
        onOpenChange={setLibraryPickerOpen}
        onShareFiles={handleShareFiles}
      />

      <AlertDialog open={!!fileToRemove} onOpenChange={() => setFileToRemove(null)}>
        <AlertDialogContent className={isMobile ? 'max-w-full mx-2' : ''}>
          <AlertDialogHeader className={isMobile ? 'px-4 py-3' : ''}>
            <AlertDialogTitle className={isMobile ? 'text-base' : ''}>Remove File</AlertDialogTitle>
            <AlertDialogDescription className={isMobile ? 'text-xs break-words' : 'break-words'}>
              Are you sure you want to remove "{fileToRemove?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? 'flex-col gap-2 px-4 pb-3' : ''}>
            <AlertDialogCancel className={isMobile ? 'w-full text-xs h-8' : ''}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className={`bg-destructive text-destructive-foreground hover:bg-destructive/90 ${isMobile ? 'w-full text-xs h-8' : ''}`}
            >
              Remove File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2">
          <div className={`bg-background rounded-lg ${isMobile ? 'max-w-full' : 'max-w-4xl'} max-h-[90vh] w-full overflow-hidden`}>
            <div className={`flex items-center justify-between ${isMobile ? 'p-2' : 'p-4'} border-b`}>
              <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold break-words`}>Preview</h3>
              <Button 
                variant="ghost" 
                size={isMobile ? "sm" : "sm"}
                className={isMobile ? 'h-6 w-6 p-0' : ''}
                onClick={() => {
                  setPreviewUrl(null);
                  setPreviewType(null);
                }}
              >
                ✕
              </Button>
            </div>
            <div className={isMobile ? 'p-2' : 'p-4'}>
              {previewType === 'images' ? (
                <div>
                  <img 
                    src={`/api/library/preview?path=${encodeURIComponent(previewUrl)}`}
                    alt="Preview"
                    className="max-w-full max-h-[70vh] object-contain mx-auto"
                    onLoad={(e) => {
                      console.log('Image dimensions:', e.target.naturalWidth, 'x', e.target.naturalHeight);
                    }}
                    onError={(e) => {
                      console.log('❌ Image failed to load via API');
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
                    console.log('❌ Video failed to load via API');
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
                  src={`/api/library/preview?path=${encodeURIComponent(previewUrl)}`}
                  controls
                  className="w-full"
                  onLoadStart={() => {
                    console.log('✅ Audio started loading via API');
                  }}
                  onError={(e) => {
                    console.log('❌ Audio failed to load via API');
                    e.target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'text-center py-8';
                    fallback.innerHTML = `
                      <p class="text-muted-foreground mb-4">Audio failed to load</p>
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
              ) : previewType === 'pdf' ? (
                <div>
                  <div className={isMobile ? 'mb-2' : 'mb-4'}>
                    <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium mb-2 break-words`}>PDF Preview</h4>
                    <iframe
                      src={`/api/library/preview?path=${encodeURIComponent(previewUrl)}`}
                      className={`w-full ${isMobile ? 'h-[50vh]' : 'h-[60vh]'} border rounded`}
                      title="PDF Preview"
                      onLoad={() => {
                        console.log('✅ PDF loaded successfully via API');
                      }}
                      onError={() => {
                        console.log('❌ PDF failed to load via API');
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      className={`w-full ${isMobile ? 'text-xs h-8' : ''}`}
                      size={isMobile ? "sm" : "default"}
                      onClick={() => {
                        const apiUrl = `/api/library/preview?path=${encodeURIComponent(previewUrl)}`;
                        window.open(apiUrl, '_blank');
                      }}
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              ) : previewType === 'document' ? (
                <div>
                  <div className={isMobile ? 'mb-2' : 'mb-4'}>
                    <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium mb-2 break-words`}>Document Preview</h4>
                    <div className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mb-2 break-words`}>Document preview not available</p>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground mb-2 break-words`}>This file type cannot be previewed inline</p>
                    </div>
                  </div>
                  <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
                    <Button 
                      variant="outline" 
                      className={`w-full ${isMobile ? 'text-xs h-8' : ''}`}
                      size={isMobile ? "sm" : "default"}
                      onClick={() => {
                        const apiUrl = `/api/library/preview?path=${encodeURIComponent(previewUrl)}`;
                        window.open(apiUrl, '_blank');
                      }}
                    >
                      Open in New Tab
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`w-full ${isMobile ? 'text-xs h-8' : ''}`}
                      size={isMobile ? "sm" : "default"}
                      onClick={() => {
                        window.open(previewUrl, '_blank');
                      }}
                    >
                      Open Original URL
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mb-2 break-words`}>Preview not available for this file type</p>
                  <Button 
                    variant="outline" 
                    className={isMobile ? 'text-xs h-8 w-full' : ''}
                    size={isMobile ? "sm" : "default"}
                    onClick={() => {
                      window.open(previewUrl, '_blank');
                    }}
                  >
                    Open in New Tab
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
