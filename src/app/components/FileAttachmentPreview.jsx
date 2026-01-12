"use client"

import React from 'react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { FileText, Image, Video, Music, Download, Eye } from 'lucide-react';

export const FileAttachmentPreview = ({
  fileName,
  fileSize,
  fileType,
  fileUrl,
  showActions = true,
  className = ""
}) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (fileType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const getFileTypeLabel = () => {
    if (fileType.startsWith('image/')) return 'Image';
    if (fileType.startsWith('video/')) return 'Video';
    if (fileType.startsWith('audio/')) return 'Audio';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('document') || fileType.includes('word')) return 'Document';
    return 'File';
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreview = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <Card className={`p-3 max-w-sm ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 text-muted-foreground">
          {getFileIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              {getFileTypeLabel()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(fileSize)}
            </span>
          </div>
          
          <p className="text-sm font-medium truncate" title={fileName}>
            {fileName}
          </p>
        </div>

        {showActions && fileUrl && (
          <div className="flex space-x-1">
            {fileType.startsWith('image/') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreview}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};