"use client"

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent } from "@/app/components/ui/card";
import { ChevronRight, ChevronDown, Folder, Search, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";

export function TreePickerDialog({ 
  open, 
  onOpenChange, 
  folders, 
  selectedFolderId, 
  onSelect, 
  title = "Select Folder",
  allowRoot = true,
  categoryInfo
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [highlightedFolderId, setHighlightedFolderId] = useState(selectedFolderId);

  // Expand all folders when dialog opens
  useEffect(() => {
    if (open && folders.length > 0) {
      const expandAll = (folderList) => {
        const ids = new Set();
        const traverse = (items) => {
          items.forEach(folder => {
            if (folder.children && folder.children.length > 0) {
              ids.add(folder.id);
              traverse(folder.children);
            }
          });
        };
        traverse(folderList);
        setExpandedFolders(ids);
      };
      expandAll(folders);
    }
  }, [open, folders]);

  // Filter folders based on search query
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;

    const searchLower = searchQuery.toLowerCase();
    const filterTree = (folderList) => {
      return folderList
        .map(folder => {
          const matches = folder.name.toLowerCase().includes(searchLower);
          const filteredChildren = folder.children && folder.children.length > 0
            ? filterTree(folder.children)
            : [];

          // Include folder if it matches or has matching children
          if (matches || filteredChildren.length > 0) {
            return {
              ...folder,
              children: filteredChildren,
              _highlight: matches
            };
          }
          return null;
        })
        .filter(Boolean);
    };

    return filterTree(folders);
  }, [folders, searchQuery]);

  // Auto-expand folders that match search
  useEffect(() => {
    if (searchQuery.trim() && filteredFolders.length > 0) {
      const expandMatching = (folderList) => {
        const ids = new Set(expandedFolders);
        const traverse = (items) => {
          items.forEach(folder => {
            if (folder._highlight || (folder.children && folder.children.length > 0)) {
              ids.add(folder.id);
              if (folder.children) {
                traverse(folder.children);
              }
            }
          });
        };
        traverse(filteredFolders);
        setExpandedFolders(ids);
      };
      expandMatching(filteredFolders);
    }
  }, [searchQuery, filteredFolders]);

  const toggleExpand = (folderId) => {
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

  const handleSelect = (folderId) => {
    setHighlightedFolderId(folderId);
  };

  const handleConfirm = () => {
    onSelect(highlightedFolderId);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setHighlightedFolderId(selectedFolderId);
    setSearchQuery("");
    onOpenChange(false);
  };

  // Recursive folder tree item component
  const FolderTreeItem = ({ folder, depth = 0 }) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = highlightedFolderId === folder.id;
    const indentLevel = depth * 20;

    return (
      <div>
        <Card
          className={`group hover:shadow-md transition-all cursor-pointer border-2 mb-1 ${
            isSelected 
              ? 'border-primary bg-primary/10' 
              : 'hover:border-primary/50 border-transparent'
          }`}
          onClick={() => handleSelect(folder.id)}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${indentLevel}px` }}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(folder.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="w-6 shrink-0" />
              )}
              <div className={`${categoryInfo?.color || 'bg-primary'} rounded-lg p-1.5 shrink-0`}>
                <Folder className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h4 
                        className={`font-medium truncate text-sm ${
                          folder._highlight ? 'text-primary font-semibold' : ''
                        }`}
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
              {isSelected && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>
        {hasChildren && isExpanded && (
          <div className="ml-6">
            {folder.children.map((child) => (
              <FolderTreeItem key={child.id} folder={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Folders</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search folder name..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Folder Tree */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-3 min-h-[300px] max-h-[400px]">
            {allowRoot && (
              <Card
                className={`group hover:shadow-md transition-all cursor-pointer border-2 mb-1 ${
                  highlightedFolderId === null
                    ? 'border-primary bg-primary/10'
                    : 'hover:border-primary/50 border-transparent'
                }`}
                onClick={() => handleSelect(null)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`${categoryInfo?.color || 'bg-primary'} rounded-lg p-1.5 shrink-0`}>
                      <Folder className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Root (No Folder)</h4>
                    </div>
                    {highlightedFolderId === null && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            {filteredFolders.length > 0 ? (
              filteredFolders.map((folder) => (
                <FolderTreeItem key={folder.id} folder={folder} />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {searchQuery ? 'No folders found matching your search' : 'No folders available'}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

