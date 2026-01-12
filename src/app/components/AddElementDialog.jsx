"use client"

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Upload, CheckSquare, MessageSquare, FileText, Image, Video, Music } from "lucide-react";

export function AddElementDialog({
  open,
  onOpenChange,
  elementType,
  programDuration,
  defaultWeek = 1,
  preselectedDay,
  preselectedWeek,
  onAddElement
}) {
  const [selectedWeek, setSelectedWeek] = useState(preselectedWeek || defaultWeek);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(preselectedDay || 1);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [libraryFiles, setLibraryFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // Update state when props change
  useEffect(() => {
    if (preselectedWeek) {
      setSelectedWeek(preselectedWeek);
    }
    if (preselectedDay) {
      setSelectedDayOfWeek(preselectedDay);
    }
  }, [preselectedWeek, preselectedDay]);
  
  // Content selection state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('articles');
  
  // Task state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('client');
  
  // Message state
  const [messageText, setMessageText] = useState('');

  const getElementInfo = (type) => {
    switch (type) {
      case 'content':
        return {
          title: 'Share File from Library',
          icon: <Upload className="h-5 w-5" />,
          description: 'Share a file from your library with the client'
        };
      case 'task':
        return {
          title: 'Create Task',
          icon: <CheckSquare className="h-5 w-5" />,
          description: 'Create a task for the client or yourself'
        };
      case 'message':
        return {
          title: 'Send Message',
          icon: <MessageSquare className="h-5 w-5" />,
          description: 'Send an automated message to the client'
        };
      default:
        return {
          title: 'Add Element',
          icon: null,
          description: 'Add a new element to the program'
        };
    }
  };

  // Library data
  const categories = [
    { id: 'articles', name: 'Articles', icon: FileText, color: 'bg-blue-500' },
    { id: 'images', name: 'Images', icon: Image, color: 'bg-green-500' },
    { id: 'videos', name: 'Videos', icon: Video, color: 'bg-purple-500' },
    { id: 'sounds', name: 'Audio', icon: Music, color: 'bg-orange-500' }
  ];

  // Fetch library files from API
  const fetchLibraryFiles = useCallback(async () => {
    if (elementType === 'content') {
      try {
        setLoadingFiles(true);
        const response = await fetch('/api/library/all');
        const data = await response.json();
        
        if (data.status) {
          setLibraryFiles(data.resources || []);
        } else {
          console.error('Failed to fetch library files:', data.message);
          setLibraryFiles([]);
        }
      } catch (error) {
        console.error('Error fetching library files:', error);
        setLibraryFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    }
  }, [elementType]);

  useEffect(() => {
    fetchLibraryFiles();
  }, [fetchLibraryFiles]);

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'audio': case 'mp3': return <Music className="h-4 w-4" />;
      case 'video': case 'mp4': return <Video className="h-4 w-4" />;
      case 'image': case 'jpg': case 'png': return <Image className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const toggleFileSelection = (file) => {
    setSelectedFiles(prev => 
      prev.find(f => f.id === file.id)
        ? prev.filter(f => f.id !== file.id)
        : [...prev, file]
    );
  };

  const getElementData = (type) => {
    switch (type) {
      case 'content':
        return {
          title: selectedFiles[0]?.name || '',
          description: '',
          assignedTo: 'client',
          libraryFileId: selectedFiles[0]?.id || '',
          url: selectedFiles[0]?.url || null
        };
      case 'task':
        return {
          title: taskTitle,
          description: taskDescription,
          dueInDays: 7,
          assignedTo: taskAssignedTo
        };
      case 'message':
        return {
          message: messageText,
          isAutomatic: true
        };
    }
  };


  const handleAddElement = () => {
    if (!elementType) return;

    // Convert week and day-of-week to absolute day number
    const scheduledDay = (selectedWeek - 1) * 7 + selectedDayOfWeek;
    const elementInfo = getElementInfo(elementType);

    const newElement = {
      type: elementType,
      scheduledDay,
      scheduledTime: selectedTime,
      title: getElementTitle(),
      data: getElementData(elementType)
    };

    onAddElement(newElement);
    resetDialog();
    onOpenChange(false);
  };

  const handleCancel = () => {
    resetDialog();
    onOpenChange(false);
  };

  const getElementTitle = () => {
    switch (elementType) {
      case 'content':
        return selectedFiles[0]?.name || 'Share File';
      case 'task':
        return taskTitle || 'New Task';
      case 'message':
        return messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '') || 'Send Message';
      default:
        return 'New Element';
    }
  };

  const resetDialog = () => {
    setSelectedFiles([]);
    setTaskTitle('');
    setTaskDescription('');
    setTaskAssignedTo('client');
    setMessageText('');
    setSelectedWeek(preselectedWeek || defaultWeek);
    setSelectedDayOfWeek(preselectedDay || 1);
    setSelectedTime('09:00');
  };

  const isFormValid = () => {
    switch (elementType) {
      case 'content': return selectedFiles.length > 0;
      case 'task': return taskTitle.trim() !== '';
      case 'message': return messageText.trim() !== '';
      default: return false;
    }
  };

  const generateWeekOptions = () => {
    const weeks = [];
    for (let i = 1; i <= programDuration; i++) {
      weeks.push({
        value: i.toString(),
        label: `Week ${i}`
      });
    }
    return weeks;
  };

  if (!elementType) return null;

  const elementInfo = getElementInfo(elementType);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const previewText = `${getElementTitle()} - Week ${selectedWeek}, ${dayNames[selectedDayOfWeek - 1]}`;

  const renderTimeSelector = () => (
    <div className="space-y-4 border-b pb-4">
      {!(preselectedDay && preselectedWeek) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="week">Week</Label>
            <Select value={selectedWeek.toString()} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {generateWeekOptions().map(week => (
                  <SelectItem key={week.value} value={week.value}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dayOfWeek">Day of Week</Label>
            <Select value={selectedDayOfWeek.toString()} onValueChange={(value) => setSelectedDayOfWeek(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="2">Tuesday</SelectItem>
                <SelectItem value="3">Wednesday</SelectItem>
                <SelectItem value="4">Thursday</SelectItem>
                <SelectItem value="5">Friday</SelectItem>
                <SelectItem value="6">Saturday</SelectItem>
                <SelectItem value="7">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );

  const renderContentSection = () => {
    switch (elementType) {
      case 'content':
        return (
          <div className="space-y-4">
            <div className="flex gap-2 border-b">
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <category.icon className="h-4 w-4" />
                  {category.name}
                </Button>
              ))}
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {loadingFiles ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading files...</p>
                    </div>
                  </div>
                ) : libraryFiles
                  .filter(file => file.category === selectedCategory)
                  .length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No files found in this category</p>
                    </div>
                  </div>
                ) : (
                  libraryFiles
                    .filter(file => file.category === selectedCategory)
                    .map(file => (
                      <div
                        key={file.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                        onClick={() => toggleFileSelection(file)}
                      >
                        <Checkbox
                          checked={selectedFiles.some(f => f.id === file.id)}
                          onChange={() => toggleFileSelection(file)}
                        />
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.type)}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.size}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {file.type}
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
            
            {selectedFiles.length > 0 && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Selected files:</p>
                <div className="mt-1 space-y-1">
                  {selectedFiles.map(file => (
                    <p key={file.id} className="text-xs text-muted-foreground">• {file.name}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'task':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Task Title</Label>
              <Input
                id="taskTitle"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taskDescription">Description</Label>
              <Textarea
                id="taskDescription"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Describe what needs to be done..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Assign To</Label>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="assign-client"
                    name="assignedTo"
                    value="client"
                    checked={taskAssignedTo === 'client'}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="assign-client" className="text-sm font-normal">Assign to Client</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="assign-coach"
                    name="assignedTo"
                    value="coach"
                    checked={taskAssignedTo === 'coach'}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="assign-coach" className="text-sm font-normal">Assign to Me (Coach)</Label>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'message':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="messageText">Message</Label>
              <Textarea
                id="messageText"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter the message to send to the client..."
                rows={4}
              />
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> This message will be sent automatically on the scheduled day and time.
              </p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const renderPreview = () => (
    <div className="border-t pt-4">
      <div className="bg-muted p-3 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Preview:</strong> {previewText}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {elementInfo.icon}
            {elementInfo.title}
          </DialogTitle>
          <DialogDescription>
            {elementInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {renderTimeSelector()}
          {renderContentSection()}
          {renderPreview()}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleAddElement} disabled={!isFormValid()}>
              Add Element
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}