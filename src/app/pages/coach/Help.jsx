"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  MessageCircle, 
  Mail, 
  Phone, 
  FileText, 
  Video,
  Users,
  Calendar,
  Shield,
  Lightbulb,
  ExternalLink
} from "lucide-react";
import { useTranslation } from "@/app/context/LanguageContext";

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslation();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const faqData = [
    {
      question:   "How do I schedule a session?",
      answer: "Simply click the 'Schedule Session' button in the group's details page, select a date and time, and click 'Save'. You'll receive a confirmation email and be able to view the session in the group's calendar."
    },
    {
      question: "How do I create a group?",
      answer: "Go to the 'Groups' page and click the 'Create Group' button. Fill out the details and click 'Create'. The group will be added to your dashboard."
    },
    {
          question: "How do I manage my users?",
      answer: "Go to the 'Users' page and click the 'Create User' button. Fill out the details and click 'Create'. The user will be added to your dashboard."
    },
    {
        question: "How do I export reports?",
      answer: "Go to the 'Reports' page and click the 'Export' button. You'll receive a CSV file with the data."
    },
    {
      question: "How do I record video sessions?",
      answer: "Go to the 'Sessions' page and click the 'Record' button. You'll be able to record the session and save it to your dashboard."
    },
    {
      question: "How do I manage group therapy?",
      answer: "Go to the 'Group Therapy' page and click the 'Manage Group' button. You'll be able to manage the group's therapy sessions."
    }
  ];

  const tutorials = [
    {
      title: "Getting Started",
      description: "Learn how to get started with the platform and create your first group.",
      duration: "5 minutes",
      type: "video"
    },
    {
      title: "Client Management",
      description: "Learn how to manage your clients and their progress.",
      duration: "10 minutes",
      type: "article"
    },
    {
      title: "Group Therapy",
      description: "Learn how to manage your group therapy sessions and clients.",
      duration: "15 minutes",
      type: "video"
    },
    {
      title: "Session Documentation",
      description: "Learn how to document your sessions and clients.",
      duration: "10 minutes",
      type: "article"
    }
  ];

  const filteredFAQ = faqData.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${isMobile ? 'px-4 pb-24' : ''}`}>
      {/* Page Header */}
      <div className={`flex items-center ${isMobile ? 'flex-col gap-3' : 'justify-between'}`}>
        <div>
          <h2 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-foreground flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
            <HelpCircle className={`${isMobile ? 'h-5 w-5' : 'h-8 w-8'} text-primary`} />
            {t('navigation.help')}
          </h2>
          <p className={`text-muted-foreground ${isMobile ? 'text-xs mt-0.5' : 'mt-1'}`}>{t('navigation.help')}</p>
        </div>
        <Button className={`bg-gradient-primary text-white ${isMobile ? 'text-xs px-2 h-8 w-full' : ''}`} size={isMobile ? "sm" : "default"}>
          <MessageCircle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? 'mr-1' : 'mr-2'}`} />
          {isMobile ? 'Contact' : t('common.buttons.contact', 'Contact Support')}
        </Button>
      </div>

      {/* Search Bar */}
      <Card className={`shadow-soft border-border bg-card ${isMobile ? 'p-3' : ''}`}>
        <CardContent className={isMobile ? 'pt-3 px-0' : 'pt-6'}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
            <Input 
              placeholder={t('common.buttons.search')}
              className={`${isMobile ? 'pl-8 h-9 text-sm' : 'pl-10'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="faq" className={`space-y-6 ${isMobile ? 'space-y-3' : ''}`}>
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="faq" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {t('navigation.help', 'FAQ')}
          </TabsTrigger>
          <TabsTrigger value="tutorials" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {t('navigation.help', 'Tutorials')}
          </TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {t('common.buttons.contact', 'Contact')}
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            {t('navigation.resources')}
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq">
          <Card className="shadow-soft border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                FAQ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-4">
                {filteredFAQ.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="text-left hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              
              {filteredFAQ.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No results found for "{searchQuery}"</p>
                  <p className="text-sm">Try searching for a different term</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tutorials Tab */}
        <TabsContent value="tutorials">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tutorials.map((tutorial, index) => (
              <Card key={index} className="shadow-soft border-border bg-card hover:shadow-medium transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {tutorial.type === "video" ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : (
                        <FileText className="h-5 w-5 text-primary" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{tutorial.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{tutorial.duration}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {tutorial.type === "video" ? "Watch Video" : "Read Article"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-soft border-border bg-card mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Quick Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 p-4 bg-muted/30 rounded-lg">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Client Engagement</h4>
                  <p className="text-sm text-muted-foreground">Learn how to engage your clients and keep them interested in the sessions.</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-4 bg-muted/30 rounded-lg">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Session Planning</h4>
                  <p className="text-sm text-muted-foreground">Learn how to plan your sessions and make them more effective.</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-4 bg-muted/30 rounded-lg">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Data Security</h4>
                  <p className="text-sm text-muted-foreground">Learn how to keep your data secure and protected.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-soft border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Get in Touch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Email</h4>
                    <p className="text-sm text-muted-foreground">support@coachmind.com</p>
                    <p className="text-xs text-muted-foreground">We'll get back to you as soon as possible.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Phone</h4>
                    <p className="text-sm text-muted-foreground">+1 (555) 555-5555</p>
                    <p className="text-xs text-muted-foreground">Monday - Friday, 9am - 5pm</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Live Chat</h4>
                    <p className="text-sm text-muted-foreground">Available during business hours</p>
                    <p className="text-xs text-muted-foreground">We'll get back to you as soon as possible.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border bg-card">
              <CardHeader>
                  <CardTitle>Send Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input placeholder="Enter your subject" />
                </div>

                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select className="w-full p-2 border rounded-md bg-background">
                    <option>Technical</option>
                    <option>Account</option>
                    <option>Feature</option>
                    <option>Billing</option>
                    <option>General</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea 
                    placeholder="Enter your message"
                    className="min-h-[120px]"
                  />
                </div>

                <Button className="w-full">Send</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="shadow-soft border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Documentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground mb-4">Access to our documentation and guides</p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Documentation
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Video Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Access to our video library</p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Video Library
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Community
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Join our community and get help from other users</p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Community
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Learn from our best practices</p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Best Practices
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security Center
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Access our security center</p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Security Center
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  What's New
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Get the latest updates</p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access What's New
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}