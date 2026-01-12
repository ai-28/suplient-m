"use client"
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";
import { 
  Video,
  Image,
  FileText,
  Volume2,
  Layout,
  BookOpen,
  Eye,
  Share2,
  Loader2
} from "lucide-react";

const categories = [
  { id: "videos", name: "Videos", icon: Video, color: "text-blue-500" },
  { id: "images", name: "Images", icon: Image, color: "text-green-500" },
  { id: "articles", name: "Articles", icon: FileText, color: "text-purple-500" },
  { id: "sounds", name: "Sounds", icon: Volume2, color: "text-orange-500" },
];

export function LibraryPickerModal({ open, onOpenChange, onShareFiles }) {
  const [selectedCategory, setSelectedCategory] = useState("videos");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(null);

  const fetchLibraryResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/library/all');
      if (!response.ok) {
        throw new Error('Failed to fetch library resources');
      }
      const result = await response.json();
      if (result.status) {
        setAllFiles(result.resources || []);
        setCategoryCounts(result.counts || {});
      } else {
        throw new Error(result.message || 'Failed to fetch resources');
      }
    } catch (err) {
      console.error('Error fetching library resources:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLibraryResources();
    }
  }, [open]);

  const filteredFiles = allFiles.filter(file => file.category === selectedCategory);

  const toggleFileSelection = (file) => {
    setSelectedFiles(prev => 
      prev.find(f => f.id === file.id)
        ? prev.filter(f => f.id !== file.id)
        : [...prev, file]
    );
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      await onShareFiles(selectedFiles);
      setSelectedFiles([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error sharing files:', error);
      // Don't close modal on error, let user try again
    } finally {
      setSharing(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setError(null);
    setSharing(false);
    onOpenChange(false);
  };

  const getFileIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'video': return <Video className="h-4 w-4 text-blue-500" />;
      case 'image': return <Image className="h-4 w-4 text-green-500" />;
      case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
      case 'audio': return <Volume2 className="h-4 w-4 text-orange-500" />;
      case 'document': return <FileText className="h-4 w-4 text-blue-600" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[600px]">
        <DialogHeader>
          <DialogTitle>Share Files from Library</DialogTitle>
        </DialogHeader>
        
        <div className="flex h-full gap-4">
          {/* Categories Sidebar */}
          <div className="w-48 border-r border-border pr-4">
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  const count = categoryCounts[category.id] || 0;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <IconComponent className={`h-4 w-4 mr-2 ${category.color}`} />
                      <span className="flex-1 text-left">{category.name}</span>
                      {count > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Files Grid */}
          <div className="flex-1">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading library...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <p className="text-sm text-destructive mb-2">Error: {error}</p>
                    <Button size="sm" variant="outline" onClick={fetchLibraryResources}>
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">No files in this category</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredFiles.map((file) => (
                    <div 
                      key={file.id} 
                      className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedFiles.some(f => f.id === file.id)}
                        onCheckedChange={() => toggleFileSelection(file)}
                      />
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.type} • {file.size}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2">
            {selectedFiles.length > 0 && (
              <Badge variant="secondary">
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleShare}
              disabled={selectedFiles.length === 0 || sharing}
            >
              {sharing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Selected Files
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
