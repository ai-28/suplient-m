"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Loader2 } from "lucide-react";
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
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export function CreateNoteDialog({ clientId, onNoteCreated, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          clientId: clientId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create note');
      }

      console.log('Note created successfully:', result.note);
      
      // Call the callback to refresh the notes list
      if (onNoteCreated) {
        onNoteCreated(result.note);
      }
      
      setIsOpen(false);
      form.reset();
      
    } catch (error) {
      console.error('Error creating note:', error);
      alert(`Error creating note: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className={isMobile ? 'max-w-full mx-2' : 'max-w-md'}>
        <DialogHeader className={isMobile ? 'px-4 py-3' : ''}>
          <DialogTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
            <FileText className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-primary`} />
            Create New Note
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={isMobile ? 'space-y-3 px-4' : 'space-y-4'}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isMobile ? 'text-xs' : ''}>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter note title" 
                      className={isMobile ? 'text-xs h-8' : ''}
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
                  <FormLabel className={isMobile ? 'text-xs' : ''}>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter note description (optional)"
                      className={isMobile ? 'min-h-[60px] text-xs' : 'min-h-[100px]'}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className={isMobile ? 'text-xs' : ''} />
                </FormItem>
              )}
            />

            <div className={`flex ${isMobile ? 'flex-col-reverse gap-2' : 'justify-end space-x-2'} ${isMobile ? 'pt-2' : 'pt-4'}`}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className={isMobile ? 'w-full text-xs h-8' : ''}
                size={isMobile ? "sm" : "default"}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className={isMobile ? 'w-full text-xs h-8' : ''}
                size={isMobile ? "sm" : "default"}
              >
                {isLoading ? (
                  <>
                    <Loader2 className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} animate-spin`} />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                    Create Note
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
