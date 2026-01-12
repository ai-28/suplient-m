"use client"

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const editTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
  assignedTo: z.string().optional(),
});



// Mock client data - same as CreateTaskDialog
const mockClients = [
  { id: "1", name: "John Doe", avatar: "JD" },
  { id: "2", name: "Alice Smith", avatar: "AS" },
  { id: "3", name: "Bob Dylan", avatar: "BD" },
  { id: "4", name: "Emma Wilson", avatar: "EW" },
  { id: "5", name: "Mark Johnson", avatar: "MJ" },
];

export function EditTaskDialog({ open, onOpenChange, task, onTaskUpdated }) {

  const form = useForm({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
    },
  });

  useEffect(() => {
    if (task && open) {
      form.reset({
        title: task.task || task.title || "",
        description: task.description || "",
        dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
        assignedTo: task.assignedTo || task.client || "",
      });
    }
  }, [task, open, form]);

  const onSubmit = (data) => {
    
    if (onTaskUpdated) {
      onTaskUpdated(data);
    }
    
    toast({
      title: "Task Updated",
      description: `Task "${data.title}" has been updated successfully.`,
    });
    
    onOpenChange(false);
  };

  const getTaskType = () => {
    if (task?.client || task?.assignedTo) return "client";
    if (task?.groupName) return "group";
    return "personal";
  };

  const taskType = getTaskType();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Edit {taskType === "personal" ? "Personal" : taskType === "client" ? "Client" : "Group"} Task
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {taskType === "client" && (
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Assigned to Client
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                                {client.avatar}
                              </div>
                              {client.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {taskType === "group" && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Editing task for group: {task?.groupName}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Task Title
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter task title..." 
                      className="bg-background border-border focus:border-primary"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add task description..." 
                      className="bg-background border-border focus:border-primary min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-sm font-medium text-foreground">
                    Due Date
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal bg-background border-border hover:bg-muted",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-border hover:bg-muted"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                variant="outline"
                className="bg-gradient-primary text-black shadow-medium hover:shadow-strong transition-all"
              >
                Update Task
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
