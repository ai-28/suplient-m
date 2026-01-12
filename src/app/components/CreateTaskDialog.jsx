"use client"

import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { CalendarIcon, Plus, User, Users, X, Search } from "lucide-react";
import { useClients } from "@/app/hooks/useClients";
import { useGroupsForTasks } from "@/app/hooks/useGroupsForTasks";

import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  assignedTo: z.string().optional(),
  selectedClients: z.array(z.string()).optional(),
  selectedGroup: z.string().optional(),
  isRepetitive: z.boolean().optional(),
  repetitiveFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  repetitiveCount: z.number().min(1).max(50).optional(),
}).refine((data) => {
  // If not repetitive, due date is required
  if (!data.isRepetitive && !data.dueDate) {
    return false;
  }
  return true;
}, {
  message: "Due date is required for one-time tasks",
  path: ["dueDate"],
});


export function CreateTaskDialog({ 
  children, 
  onTaskCreated,
  clientId,
  clientName,
  hideGroupTasks = false,
  mode = null,
  groupId = null,
  memberCount = 0
  }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
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
  
  // Fetch real data from database
  const { availableClients, loading: clientsLoading, error: clientsError } = useClients();
  const { groups, loading: groupsLoading, error: groupsError } = useGroupsForTasks();
  const [taskType, setTaskType] = useState(
    mode === "group" ? "group" : 
    clientId ? "client" : "personal"
  );
  const [selectedClients, setSelectedClients] = useState(clientId ? [clientId] : []);
  const [selectedGroup, setSelectedGroup] = useState(
    mode === "group" && groupId ? { id: groupId, memberCount } : null
  );
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [groupSearchOpen, setGroupSearchOpen] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const popoverContentRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      selectedClients: clientId ? [clientId] : [],
      selectedGroup: mode === "group" && groupId ? groupId : "",
      isRepetitive: false,
      repetitiveFrequency: "weekly",
      repetitiveCount: 1,
    },
  });

  const watchIsRepetitive = form.watch("isRepetitive");
  const watchRepetitiveFrequency = form.watch("repetitiveFrequency");

  const getNextDueDate = () => {
    const today = new Date();
    switch (watchRepetitiveFrequency) {
      case "daily":
        return addDays(today, 1);
      case "weekly":
        return addWeeks(today, 1);
      case "monthly":
        return addMonths(today, 1);
      default:
        return addWeeks(today, 1);
    }
  };

  const onSubmit = async (data) => {
    try {
      // Add task type and selected group/client info to the data
      const taskData = {
        ...data,
        taskType,
        selectedGroup: selectedGroup ? {
          id: selectedGroup.id,
          name: selectedGroup.name,
          memberCount: selectedGroup.memberCount
        } : null,
        selectedClients: selectedClients.length > 0 ? selectedClients : (clientId ? [clientId] : null)
      };

      console.log('Creating task with data:', taskData);
      console.log('Selected clients state:', selectedClients);

      // Send to backend API - use group tasks API when in group mode
      const apiUrl = mode === "group" && groupId 
        ? `/api/groups/${groupId}/tasks`
        : '/api/tasks';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }

      const result = await response.json();
    
    // Handle different response formats
    if (onTaskCreated) {
      if (mode === "group" && result.task) {
        // Group tasks API returns { task: {...} }
        onTaskCreated(result.task);
      } else if (result.tasks && result.tasks.length > 0) {
        // Regular tasks API returns { tasks: [...] }
        onTaskCreated(result.tasks[0]);
      }
    }
    
    setOpen(false);
    form.reset();
    } catch (error) {
      console.error('Error creating task:', error);
      // You might want to show a toast notification here
      alert('Failed to create task: ' + error.message);
    }
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      form.reset();
      // Only reset selectedClients if not in client context
      if (!clientId) {
        setSelectedClients([]);
      } else {
        setSelectedClients([clientId]);
      }
      setSelectedGroup(null);
      setClientSearchQuery("");
      setGroupSearchQuery("");
    }
    setOpen(newOpen);
  };

  const filteredClients = availableClients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) &&
    !selectedClients.includes(client.id)
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) &&
    (!selectedGroup || selectedGroup.id !== group.id)
  );

  const handleClientSelect = (clientId) => {
    console.log('🔍 Selecting client:', clientId, 'Current selected:', selectedClients);
    if (!selectedClients.includes(clientId)) {
      const newSelectedClients = [...selectedClients, clientId];
      console.log('✅ Adding client to selection:', newSelectedClients);
      setSelectedClients(newSelectedClients);
      form.setValue("selectedClients", newSelectedClients);
      // Clear search query after selection for better UX
      setClientSearchQuery("");
    } else {
      console.log('⚠️ Client already selected:', clientId);
    }
    // Don't close popover automatically - let user select multiple clients
    // Popover will close when clicking outside or pressing Escape
  };

  const handleClientRemove = (clientId) => {
    const newSelectedClients = selectedClients.filter(id => id !== clientId);
    setSelectedClients(newSelectedClients);
    form.setValue("selectedClients", newSelectedClients);
  };

  const handleGroupSelect = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setSelectedGroup(group);
      form.setValue("selectedGroup", groupId);
      // Clear search query after selection
      setGroupSearchQuery("");
    }
    // Don't close popover automatically - but for groups we only select one, so close it
    setGroupSearchOpen(false);
  };

  const handleGroupRemove = () => {
    setSelectedGroup(null);
    form.setValue("selectedGroup", "");
  };

  const getClientName = (clientId) => {
    const found = availableClients.find(client => client.id === clientId);
    return found ? found.name : "";
  };

  // Create a reusable form field component to avoid duplication
  const renderFormFields = () => (
    <>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
                      Task Title
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter task title..." 
                        className={`bg-background border-border focus:border-primary ${isMobile ? 'text-xs h-8' : ''}`}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className={isMobile ? 'text-xs' : ''} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add task description..." 
                        className={`bg-background border-border focus:border-primary ${isMobile ? 'min-h-[60px] text-xs' : 'min-h-[100px]'}`}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className={isMobile ? 'text-xs' : ''} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isRepetitive"
                render={({ field }) => (
                  <FormItem className={`flex flex-row items-start ${isMobile ? 'space-x-2' : 'space-x-3'} space-y-0`}>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className={isMobile ? 'h-4 w-4' : ''}
                      />
                    </FormControl>
                    <div className={`${isMobile ? 'space-y-0.5' : 'space-y-1'} leading-none flex-1 min-w-0`}>
                      <FormLabel className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground break-words`}>
                        Repetitive Task
                      </FormLabel>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>
                        Automatically create future tasks when this one is completed or becomes overdue
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {watchIsRepetitive && (
                <div className={`${isMobile ? 'space-y-2 pl-3' : 'space-y-4 pl-6'} border-l-2 border-muted`}>
                  <FormField
                    control={form.control}
                    name="repetitiveFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
                          Frequency
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={`bg-background border-border ${isMobile ? 'text-xs h-8' : ''}`}>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className={isMobile ? 'text-xs' : ''} />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repetitiveCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
                          Number of Repetitions
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="1"
                            max="50"
                            placeholder="Enter number of repetitions..." 
                            className={`bg-background border-border focus:border-primary ${isMobile ? 'text-xs h-8' : ''}`}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>
                          How many times should this task be repeated? (1-50)
                        </p>
                        <FormMessage className={isMobile ? 'text-xs' : ''} />
                      </FormItem>
                    )}
                  />

                  <div className={`bg-muted/50 ${isMobile ? 'p-2' : 'p-3'} rounded-lg`}>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground font-medium break-words`}>Next Due Date</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground break-words`}>
                      {format(getNextDueDate(), "PPP")}
                    </p>
                  </div>
                </div>
              )}

              {!watchIsRepetitive && (
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
                        Due Date
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                `${isMobile ? 'pl-2 text-xs h-8' : 'pl-3'} text-left font-normal bg-background border-border hover:bg-muted`,
                                !field.value && "text-muted-foreground"
                              )}
                              size={isMobile ? "sm" : "default"}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className={`ml-auto ${isMobile ? 'h-3 w-3' : 'h-4 w-4'} opacity-50`} />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className={`w-auto p-0 ${isMobile ? 'mx-2' : ''}`} align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage className={isMobile ? 'text-xs' : ''} />
                    </FormItem>
                  )}
                />
              )}
    </>
  );

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {children || (
            <Button className={`bg-gradient-primary text-[#1A2D4D] shadow-medium hover:shadow-strong transition-all ${isMobile ? 'text-xs h-8' : ''}`}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            >
              <Plus className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
              Create Task
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className={`${isMobile ? 'max-w-full mx-2' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader className={isMobile ? 'pb-2' : ''}>
            <DialogTitle className={`${isMobile ? 'text-base' : 'text-xl'} font-semibold text-foreground break-words`}>
            Create New Task
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className={isMobile ? 'space-y-3' : 'space-y-6'}>
            {/* Task Type Selection - hide when in client context or group mode */}
            {!hideGroupTasks && mode !== "group" && (
              <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
                <label className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground break-words`}>Task Type</label>
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-3'}`}>
                  <Button
                    type="button"
                    variant={taskType === "personal" ? "default" : "outline"}
                    onClick={() => setTaskType("personal")}
                    className={`justify-start ${isMobile ? 'text-xs h-8' : ''}`}
                    size={isMobile ? "sm" : "default"}
                  >
                    <User className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                    My Tasks
                  </Button>
                  <Button 
                    type="button" 
                    variant={taskType === "client" ? "default" : "outline"}
                    onClick={() => setTaskType("client")}
                    className={`justify-start ${isMobile ? 'text-xs h-8' : ''}`}
                    size={isMobile ? "sm" : "default"}
                  >
                    <Users className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                    Client Task
                  </Button>
                  <Button 
                    type="button"
                    variant={taskType === "group" ? "default" : "outline"}
                    onClick={() => setTaskType("group")}
                    className={`justify-start ${isMobile ? 'text-xs h-8' : ''}`}
                    size={isMobile ? "sm" : "default"}
                  >
                    <Users className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                    Group Task
                  </Button>
                </div>
              </div>
            )}

            {/* Client Selection - only show for client tasks and when not in client context */}
            {taskType === "client" && !hideGroupTasks && (
                <FormField
                  control={form.control}
                  name="selectedClients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
                        Assign to Clients
                      </FormLabel>
                      <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                        {selectedClients.length > 0 && (
                          <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
                            {selectedClients.map((clientId) => (
                              <Badge 
                                key={clientId} 
                                variant="secondary" 
                                className={`flex items-center gap-1 ${isMobile ? 'text-xs px-1.5 py-0.5' : ''}`}
                              >
                                <span className="break-words">{getClientName(clientId)}</span>
                                <X 
                                  className={isMobile ? 'h-2.5 w-2.5 cursor-pointer' : 'h-3 w-3 cursor-pointer'} 
                                  onClick={() => handleClientRemove(clientId)}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Popover 
                          open={clientSearchOpen} 
                          onOpenChange={setClientSearchOpen}
                          modal={false}
                        >
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              role="combobox"
                              aria-expanded={clientSearchOpen}
                              className={`w-full justify-between bg-background border-border hover:bg-muted ${isMobile ? 'text-xs h-8' : ''}`}
                              size={isMobile ? "sm" : "default"}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Search className={isMobile ? 'h-3 w-3 flex-shrink-0' : 'h-4 w-4 flex-shrink-0'} />
                                <span className="truncate">
                                  {selectedClients.length === 0 
                                    ? "Search and select clients..." 
                                    : `${selectedClients.length} client${selectedClients.length > 1 ? 's' : ''} selected`
                                  }
                                </span>
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            ref={popoverContentRef}
                            className={`${isMobile ? 'w-[calc(100vw-1rem)] mx-2' : 'w-[400px]'} p-0 z-[60] pointer-events-auto`}
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            onPointerDownOutside={(e) => {
                              // Check if the click is actually inside our popover content
                              if (popoverContentRef.current && popoverContentRef.current.contains(e.target)) {
                                // Click is inside popover, don't close
                                e.preventDefault();
                                return;
                              }
                              // Check if clicking inside the dialog (but outside popover)
                              const target = e.target;
                              const dialog = document.querySelector('[role="dialog"]');
                              const isTrigger = target.closest && target.closest('button[role="combobox"]');
                              if (dialog && dialog.contains(target) && !isTrigger) {
                                // Keep popover open when clicking elsewhere in dialog
                                e.preventDefault();
                              }
                            }}
                            onEscapeKeyDown={() => {
                              setClientSearchOpen(false);
                            }}
                          >
                            <div className={`${isMobile ? 'p-2 space-y-1.5' : 'p-3 space-y-2'}`}>
                              <div className="relative">
                                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
                                <Input
                                  placeholder="Search clients..."
                                  value={clientSearchQuery}
                                  onChange={(e) => {
                                    setClientSearchQuery(e.target.value);
                                  }}
                                  className={`pl-9 ${isMobile ? 'text-xs h-8' : ''}`}
                                />
                              </div>
                              <div className={`max-h-[200px] overflow-y-auto ${isMobile ? 'space-y-1' : 'space-y-1'}`}>
                                {clientsLoading ? (
                                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ${isMobile ? 'p-1.5' : 'p-2'} text-center`}>
                                    Loading clients...
                                  </div>
                                ) : clientsError ? (
                                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-destructive ${isMobile ? 'p-1.5' : 'p-2'} text-center break-words`}>
                                    Error loading clients: {clientsError}
                                  </div>
                                ) : filteredClients.length === 0 ? (
                                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ${isMobile ? 'p-1.5' : 'p-2'} text-center`}>
                                    No clients found
                                  </div>
                                ) : (
                                  filteredClients.map((client) => (
                                    <div
                                      key={client.id}
                                      className={`w-full text-left cursor-pointer hover:bg-muted rounded-md ${isMobile ? 'p-1.5' : 'p-2'} transition-colors flex items-center gap-3 select-none`}
                                      style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                                      onPointerDown={(e) => {
                                        console.log('📌 PointerDown event fired for:', client.id, client.name, e);
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleClientSelect(client.id);
                                      }}
                                      onMouseDown={(e) => {
                                        console.log('🖱️ MouseDown event fired for:', client.id, client.name, e);
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleClientSelect(client.id);
                                      }}
                                      onClick={(e) => {
                                        console.log('👆 Click event fired for:', client.id, client.name, e);
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleClientSelect(client.id);
                                      }}
                                    >
                                      <div className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} rounded-full bg-primary/10 flex items-center justify-center ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-primary flex-shrink-0`}>
                                        {client.initials}
                                      </div>
                                      <span className="flex-1 min-w-0 break-words">{client.name}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>
                        You can select multiple clients for the same task
                      </p>
                      <FormMessage className={isMobile ? 'text-xs' : ''} />
                    </FormItem>
                  )}
                />
            )}

            {/* Show selected client when in client context */}
            {hideGroupTasks && clientId && (
              <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                <label className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground break-words`}>
                  Assign to Client
                </label>
                <div className={`flex items-center gap-2 ${isMobile ? 'p-2' : 'p-3'} border rounded-lg bg-muted/50`}>
                  <div className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} rounded-full bg-primary/10 flex items-center justify-center ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-primary flex-shrink-0`}>
                    {clientName ? clientName.split(' ').map(n => n[0]).join('').toUpperCase() : 'C'}
                  </div>
                  <span className={`font-medium ${isMobile ? 'text-xs' : ''} break-words flex-1 min-w-0`}>{clientName || 'Selected Client'}</span>
                </div>
              </div>
            )}

            {/* Group Selection - only show for group tasks */}
            {taskType === "group" && (
                <FormField
                  control={form.control}
                name="selectedGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground break-words`}>
                      {mode === "group" ? "Selected Group" : "Select Group"}
                      </FormLabel>
                    <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                      {selectedGroup && (
                        <div className={`flex items-center gap-2 ${isMobile ? 'p-2' : 'p-3'} bg-muted/50 rounded-lg`}>
                          <div className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} rounded-full bg-primary/10 flex items-center justify-center ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-primary flex-shrink-0`}>
                            {selectedGroup.avatar || 'G'}
                      </div>
                          <div className="flex-1 min-w-0">
                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground break-words`}>{selectedGroup.name}</p>
                            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>{selectedGroup.memberCount} members</p>
                          </div>
                          {mode !== "group" && (
                            <X 
                              className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} cursor-pointer text-muted-foreground hover:text-foreground flex-shrink-0`} 
                              onClick={handleGroupRemove}
                            />
                          )}
                  </div>
                )}
                      {mode !== "group" && (
                        <Popover 
                          open={groupSearchOpen} 
                          onOpenChange={setGroupSearchOpen}
                          modal={false}
                        >
                          <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                            role="combobox"
                            aria-expanded={groupSearchOpen}
                            className={`w-full justify-between bg-background border-border hover:bg-muted ${isMobile ? 'text-xs h-8' : ''}`}
                            size={isMobile ? "sm" : "default"}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Search className={isMobile ? 'h-3 w-3 flex-shrink-0' : 'h-4 w-4 flex-shrink-0'} />
                              <span className="truncate">
                                {!selectedGroup 
                                  ? "Search and select a group..." 
                                  : selectedGroup.name
                                }
                              </span>
                            </div>
                              </Button>
                          </PopoverTrigger>
                        <PopoverContent 
                          className={`${isMobile ? 'w-[calc(100vw-1rem)] mx-2' : 'w-[400px]'} p-0 z-[60] pointer-events-auto`}
                          onOpenAutoFocus={(e) => e.preventDefault()}
                          onPointerDownOutside={(e) => {
                            // Check if the click is actually inside our popover content
                            const target = e.target;
                            const dialog = document.querySelector('[role="dialog"]');
                            const isTrigger = target.closest && target.closest('button[role="combobox"]');
                            if (dialog && dialog.contains(target) && !isTrigger) {
                              // Keep popover open when clicking elsewhere in dialog
                              e.preventDefault();
                            }
                          }}
                          onEscapeKeyDown={() => {
                            setGroupSearchOpen(false);
                          }}
                        >
                          <div className={`${isMobile ? 'p-2 space-y-1.5' : 'p-3 space-y-2'}`}>
                            <div className="relative">
                              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
                        <Input 
                                placeholder="Search groups..."
                                value={groupSearchQuery}
                                onChange={(e) => setGroupSearchQuery(e.target.value)}
                                className={`pl-9 ${isMobile ? 'text-xs h-8' : ''}`}
                              />
                      </div>
                            <div className={`max-h-[200px] overflow-y-auto ${isMobile ? 'space-y-1' : 'space-y-1'}`}>
                              {groupsLoading ? (
                                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ${isMobile ? 'p-1.5' : 'p-2'} text-center`}>
                                  Loading groups...
                                </div>
                              ) : groupsError ? (
                                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-destructive ${isMobile ? 'p-1.5' : 'p-2'} text-center break-words`}>
                                  Error loading groups: {groupsError}
                                </div>
                              ) : filteredGroups.length === 0 ? (
                                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ${isMobile ? 'p-1.5' : 'p-2'} text-center`}>
                                  No groups found
                                </div>
                              ) : (
                                filteredGroups.map((group) => (
                                  <div
                                    key={group.id}
                                    className={`w-full text-left cursor-pointer hover:bg-muted rounded-md ${isMobile ? 'p-1.5' : 'p-3'} transition-colors flex items-center gap-3 select-none`}
                                    style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                                    onPointerDown={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleGroupSelect(group.id);
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleGroupSelect(group.id);
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleGroupSelect(group.id);
                                    }}
                                  >
                                    <div className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} rounded-full bg-primary/10 flex items-center justify-center ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-primary flex-shrink-0`}>
                                      {group.avatar}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} break-words`}>{group.name}</p>
                                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>{group.memberCount} members</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>
                      {mode === "group" 
                        ? "This task will be assigned to all group members" 
                        : "Select a group to assign this task to all group members"
                      }
                    </p>
                        <FormMessage className={isMobile ? 'text-xs' : ''} />
                      </FormItem>
                    )}
                  />
                )}

            {/* Common form fields */}
            {renderFormFields()}

              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-end gap-3'} ${isMobile ? 'pt-2' : 'pt-4'} border-t border-border`}>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className={`border-border hover:bg-muted ${isMobile ? 'w-full text-xs h-8' : ''}`}
                  size={isMobile ? "sm" : "default"}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className={`bg-gradient-primary text-[#1A2D4D] shadow-medium hover:shadow-strong transition-all ${isMobile ? 'w-full text-xs h-8' : ''}`}
                  size={isMobile ? "sm" : "default"}
                >
                  Create Task
                </Button>
              </div>
            </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
}
