import { useState } from "react";
import { useTranslation } from "@/app/context/LanguageContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { CheckCircle2, Calendar } from "lucide-react";
import {toast} from "sonner"
const formSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().optional(),
  practiceSize: z.string().min(1, "Please select your practice size"),
  preferredTime: z.string().min(1, "Please select your preferred time"),
  message: z.string().trim().max(500).optional(),
});

export const DemoBookingForm = ({ open, onOpenChange }) => {
  const t = useTranslation();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      practiceSize: "",
      preferredTime: "",
      message: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      // TODO: Integrate with backend or Calendly API
      console.log("Demo booking submitted:", data);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
      
      toast.success(t('bookingForm.successTitle'), {
        description: t('bookingForm.successMessage') + " " + data.email,
      });
    } catch (error) {
      toast.error("Booking Failed", {
        description: "Please try again or contact support.",
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setIsSubmitted(false);
      form.reset();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!isSubmitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {t('bookingForm.title')}
              </DialogTitle>
              <DialogDescription>
                {t('bookingForm.subtitle')}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookingForm.name')} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t('bookingForm.namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookingForm.email')} *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('bookingForm.emailPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookingForm.phone')}</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder={t('bookingForm.phonePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="practiceSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookingForm.practiceSize')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('bookingForm.practiceSizePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="solo">{t('bookingForm.practiceSizes.solo')}</SelectItem>
                          <SelectItem value="small">{t('bookingForm.practiceSizes.small')}</SelectItem>
                          <SelectItem value="medium">{t('bookingForm.practiceSizes.medium')}</SelectItem>
                          <SelectItem value="large">{t('bookingForm.practiceSizes.large')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferredTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookingForm.preferredTime')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('bookingForm.preferredTimePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">{t('bookingForm.times.morning')}</SelectItem>
                          <SelectItem value="afternoon">{t('bookingForm.times.afternoon')}</SelectItem>
                          <SelectItem value="evening">{t('bookingForm.times.evening')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bookingForm.message')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('bookingForm.messagePlaceholder')}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    {t('bookingForm.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="flex-1"
                  >
                    {t('bookingForm.submit')}
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {t('hero.trustLine')}
                </p>
              </form>
            </Form>
          </>
        ) : (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
            <DialogHeader>
              <DialogTitle className="text-2xl mb-2">{t('bookingForm.successTitle')}</DialogTitle>
              <DialogDescription className="text-base space-y-2">
                <p>
                  {t('bookingForm.successMessage')}{" "}
                  <strong>{form.getValues("email")}</strong> {t('bookingForm.successMessage2')}
                </p>
              </DialogDescription>
            </DialogHeader>
            <Button onClick={handleClose} className="mt-6">
              {t('bookingForm.successClose')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
