"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { UserPlus, Phone, Mail, MapPin, Calendar as CalendarIcon2, User, Briefcase, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { useTranslation } from "@/app/context/LanguageContext";

// Force refresh to clear any cached modules

const getFormSchema = () => z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true; // Optional
    const trimmed = val.trim();
    
    // Remove formatting characters (spaces, parentheses, hyphens, dots) but keep + and digits
    const cleaned = trimmed.replace(/[\s().-]/g, '');
    
    // If starts with +, validate E.164 format
    if (cleaned.startsWith('+')) {
      // E.164: +[country code 1-3 digits][number 7-10 digits] = 8-13 digits after +
      const digitsAfterPlus = cleaned.slice(1);
      if (digitsAfterPlus.length < 8 || digitsAfterPlus.length > 13) return false;
      // Must start with 1-9 (valid country code digit)
      return /^\+[1-9]\d{7,12}$/.test(cleaned);
    }
    
    // If no +, must have country code
    // Minimum 8 digits (country code 1-3 + phone 7-10)
    // Maximum 15 digits
    if (cleaned.length < 8 || cleaned.length > 15) return false;
    // Must start with 1-9 (valid country code digit)
    return /^[1-9]\d{7,14}$/.test(cleaned);
  }, { message: "Add country code ex. +45 or 45" }),
  dateOfBirth: z.date().optional().nullable(),
  address: z.string().optional(),
  concerns: z.string().optional(),
});

export function CreateClientDialog({ onClientCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const t = useTranslation();
  const formSchema = getFormSchema();

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
      name: "",
      email: "",
      phone: "",
      dateOfBirth: null,
      address: "",
      concerns: "",
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/clients/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          address: data.address,
          concerns: data.concerns,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || "Failed to create client";
        toast.error(errorMessage, {
          duration: 5000,
        });
        throw new Error(errorMessage);
      }
      
      // Show success message with temporary password
      toast.success(t('clients.clientCreated'), {
        description: `${t('common.labels.name')}: ${result.client.name}\n${t('common.labels.email')}: ${result.client.email}\nTemporary Password: ${result.client.tempPassword}`
      });
      
      setIsOpen(false);
      form.reset();
      
      // Refresh the client list
      if (onClientCreated) {
        onClientCreated(result.client);
      }
      
    } catch (error) {
      console.error("Error creating client:", error);
      // Error toast already shown in the catch block above
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary text-[#1A2D4D] shadow-medium border-1px border-[#B6D7D1] hover:shadow-medium hover:text-white transition-all">
          <UserPlus className="h-4 w-4 mr-2" />
          {t('clients.addClient')}
        </Button>
      </DialogTrigger>
      <DialogContent className={`${isMobile ? 'max-w-full mx-2' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto bg-card border-border shadow-strong`}>
        <DialogHeader className={`${isMobile ? 'pb-2' : 'pb-4'} border-b border-border`}>
          <DialogTitle className={`${isMobile ? 'text-base' : 'text-2xl'} font-bold text-foreground flex items-center gap-2 break-words`}>
            <UserPlus className={isMobile ? 'h-4 w-4' : 'h-6 w-6'} />
            <span className="break-words min-w-0 flex-1">{t('clients.createClient')}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={isMobile ? 'space-y-3' : 'space-y-6'}>
            {/* Personal Information Section */}
            <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
              <div className={`flex items-center gap-2 ${isMobile ? 'pb-1' : 'pb-2'} border-b border-muted`}>
                <User className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
                <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground break-words`}>{t('profile.personalInfo')}</h3>
              </div>
              
              <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} ${isMobile ? 'gap-2' : 'gap-4'}`}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-foreground font-medium ${isMobile ? 'text-xs' : ''}`}>{t('common.labels.name')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('common.labels.name')} 
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel className={`text-foreground font-medium flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                         <Mail className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                         <span className="break-words">{t('common.labels.email')}</span>
                       </FormLabel>
                       <FormControl>
                         <Input 
                           type="email" 
                           placeholder="Enter email address" 
                           className={`bg-background border-border focus:border-primary ${isMobile ? 'text-xs h-8' : ''}`}
                           {...field} 
                         />
                       </FormControl>
                      <FormMessage className={isMobile ? 'text-xs' : ''} />
                    </FormItem>
                  )}
                />
              </div>

              <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} ${isMobile ? 'gap-2' : 'gap-4'}`}>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel className={`text-foreground font-medium flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                         <Phone className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                         <span className="break-words">{t('common.labels.phone')}</span>
                         <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground font-normal`}>(Optional)</span>
                       </FormLabel>
                       <FormControl>
                         <Input 
                           placeholder="Add country code ex. +45 or 45" 
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
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                       <FormLabel className={`text-foreground font-medium flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                         <CalendarIcon2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                         <span className="break-words">{t('settings.profile.birthdate')}</span>
                         <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground font-normal`}>(Optional)</span>
                       </FormLabel>
                          <FormControl>
                        <Input
                          type="date"
                          value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : null;
                            field.onChange(date || null);
                          }}
                            className={`bg-background border-border pl-4 pr-4 py-2 ${isMobile ? 'h-8 text-xs' : 'h-10 text-sm'} focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-primary/50 cursor-pointer`}
                          max={format(new Date(), "yyyy-MM-dd")}
                          min="1900-01-01"
                          placeholder="Select your date of birth"
                        />
                      </FormControl>
                      {field.value && (
                        <div className={`mt-2 ${isMobile ? 'space-y-0.5' : 'space-y-1'}`}>
                          <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground break-words`}>
                            Selected: {format(field.value, "EEEE, MMMM do, yyyy")}
                          </div>
                          <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-primary font-medium`}>
                            Age: {Math.floor((new Date() - field.value) / (365.25 * 24 * 60 * 60 * 1000))} years old
                          </div>
                        </div>
                      )}
                      <FormMessage className={isMobile ? 'text-xs' : ''} />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                     <FormLabel className={`text-foreground font-medium flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                       <MapPin className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                       <span className="break-words">{t('clients.location')}</span>
                       <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground font-normal`}>(Optional)</span>
                     </FormLabel>
                     <FormControl>
                       <Input 
                         placeholder={t('clients.location')} 
                         className={`bg-background border-border focus:border-primary ${isMobile ? 'text-xs h-8' : ''}`}
                         {...field} 
                       />
                     </FormControl>
                    <FormMessage className={isMobile ? 'text-xs' : ''} />
                  </FormItem>
                )}
              />
            </div>

            {/* Client Information Section */}
            <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
              <div className={`flex items-center gap-2 ${isMobile ? 'pb-1' : 'pb-2'} border-b border-muted`}>
                <Briefcase className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
                <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground break-words`}>Info about the client (not shared with client)</h3>
              </div>

              <FormField
                control={form.control}
                name="concerns"
                render={({ field }) => (
                  <FormItem>
                   
                    <FormControl>
                      <Textarea 
                        placeholder={t('common.labels.description')}
                        className={`bg-background border-border focus:border-primary ${isMobile ? 'min-h-[60px] text-xs' : 'min-h-[80px]'}`}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className={isMobile ? 'text-xs' : ''} />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-end space-x-3'} ${isMobile ? 'pt-2' : 'pt-4'} border-t border-border`}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className={`border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'w-full text-xs h-8' : ''}`}
                size={isMobile ? "sm" : "default"}
              >
                {t('common.buttons.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className={`bg-gradient-primary text-[#1A2D4D] shadow-medium hover:shadow-strong border-border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'w-full text-xs h-8' : ''}`}
                size={isMobile ? "sm" : "default"}
              >
                {isLoading ? (
                  <>
                    <Loader2 className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                    {t('common.messages.loading')}
                  </>
                ) : (
                  <>
                    <UserPlus className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                    {t('clients.addClient')}
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