"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Label } from "@/app/components/ui/label";
import { PageHeader } from "@/app/components/PageHeader";
import { Bell, Send, Users, User, Loader2, Archive, Eye, EyeOff, Clock } from "lucide-react";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useTranslation } from "@/app/context/LanguageContext";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/app/components/ui/badge";

export default function AdminNote() {
  const { data: session } = useSession();
  const t = useTranslation();
  const [clients, setClients] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedCoaches, setSelectedCoaches] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [showClients, setShowClients] = useState(true);
  const [showCoaches, setShowCoaches] = useState(true);
  
  // Archive state
  const [sentNotes, setSentNotes] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [activeTab, setActiveTab] = useState("send");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch clients and coaches
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingData(true);

        // Fetch clients
        const clientsResponse = await fetch('/api/admin/clients');
        const clientsData = await clientsResponse.json();
        if (clientsData.success) {
          setClients(clientsData.clients || []);
        }

        // Fetch coaches
        const coachesResponse = await fetch('/api/admin/coaches');
        const coachesData = await coachesResponse.json();
        if (coachesData.success) {
          setCoaches(coachesData.coaches || []);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(t('common.messages.error'));
      } finally {
        setFetchingData(false);
      }
    };

    if (session?.user?.id) {
      fetchData();
    }
  }, [session]);

  // Fetch sent notes archive
  const fetchSentNotes = async () => {
    setLoadingArchive(true);
    try {
      const response = await fetch('/api/admin/sent-notes');
      const data = await response.json();
      if (data.success) {
        setSentNotes(data.notes || []);
      } else {
        throw new Error(data.error || 'Failed to fetch sent notes');
      }
    } catch (error) {
      console.error('Error fetching sent notes:', error);
      toast.error('Failed to load sent notes');
    } finally {
      setLoadingArchive(false);
    }
  };

  // Fetch archive when switching to archive tab
  useEffect(() => {
    if (activeTab === 'archive' && sentNotes.length === 0) {
      fetchSentNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Handle select/deselect all clients
  const handleSelectAllClients = (checked) => {
    if (checked) {
      setSelectedClients(clients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  // Handle select/deselect all coaches
  const handleSelectAllCoaches = (checked) => {
    if (checked) {
      setSelectedCoaches(coaches.map(c => c.id));
    } else {
      setSelectedCoaches([]);
    }
  };

  // Handle client selection
  const handleClientToggle = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Handle coach selection
  const handleCoachToggle = (coachId) => {
    setSelectedCoaches(prev => 
      prev.includes(coachId) 
        ? prev.filter(id => id !== coachId)
        : [...prev, coachId]
    );
  };

  // Send notification
  const handleSendNotification = async () => {
    if (!message.trim()) {
      toast.error(t('notes.pleaseEnterMessage', 'Please enter a message'));
      return;
    }

    if (selectedClients.length === 0 && selectedCoaches.length === 0) {
      toast.error(t('notes.selectRecipient', 'Please select at least one recipient'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          clientIds: selectedClients,
          coachIds: selectedCoaches,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('notes.notificationSent', `Notification sent to ${data.recipientCount} user(s)`));
        // Reset form
        setMessage('');
        setSelectedClients([]);
        setSelectedCoaches([]);
        // Refresh archive if on archive tab
        if (activeTab === 'archive') {
          fetchSentNotes();
        }
      } else {
        throw new Error(data.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(error.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className={`page-container ${isMobile ? 'px-4' : ''}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className={`animate-spin rounded-full border-b-2 border-primary mx-auto mb-4 ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`}></div>
            <p className={`text-muted-foreground ${isMobile ? 'text-xs' : ''}`}>{t('common.messages.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-container ${isMobile ? 'px-4 pb-24' : ''}`}>
      <PageHeader 
        title={t('notes.sendNotification', 'Send Notification')} 
        subtitle={t('notes.sendNotificationDesc', 'Send real-time notifications to clients and coaches')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-4">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 max-w-full' : 'max-w-md grid-cols-2'}`}>
          <TabsTrigger value="send" className={isMobile ? 'text-xs px-2' : ''}>
            <Send className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
            {t('notes.send', 'Send')}
          </TabsTrigger>
          <TabsTrigger value="archive" className={isMobile ? 'text-xs px-2' : ''}>
            <Archive className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
            {t('notes.archive', 'Archive')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className={isMobile ? 'mt-4' : 'mt-6'}>
          <div className={`grid grid-cols-1 lg:grid-cols-3 ${isMobile ? 'gap-3' : 'gap-6'}`}>
        {/* Recipients Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clients Section */}
          <Card className={`card-standard ${isMobile ? 'p-0 shadow-none border-0' : ''}`}>
            <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
              <div className={`flex items-center ${isMobile ? 'flex-col items-start gap-2' : 'justify-between'}`}>
                <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  <Users className={`text-primary ${isMobile ? 'h-3 w-3' : 'h-5 w-5'}`} />
                  {t('navigation.clients')} ({selectedClients.length}/{clients.length})
                </CardTitle>
                <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2 w-full' : 'gap-4'}`}>
                  <Button
                    variant="ghost"
                    size={isMobile ? "sm" : "sm"}
                    onClick={() => setShowClients(!showClients)}
                    className={isMobile ? 'text-xs h-7 px-2' : ''}
                  >
                    {showClients ? t('common.buttons.hide', 'Hide') : t('common.buttons.view', 'Show')}
                  </Button>
                  <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                    <Checkbox
                      id="select-all-clients"
                      checked={selectedClients.length === clients.length && clients.length > 0}
                      onCheckedChange={handleSelectAllClients}
                      className={isMobile ? 'h-4 w-4' : ''}
                    />
                    <Label htmlFor="select-all-clients" className={`cursor-pointer ${isMobile ? 'text-xs' : ''} break-words`}>
                      {t('common.buttons.selectAll', 'Select All')}
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            {showClients && (
              <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
                <ScrollArea className={isMobile ? 'h-[200px] pr-2' : 'h-[300px] pr-4'}>
                  {clients.length === 0 ? (
                    <p className={`text-muted-foreground text-center py-8 ${isMobile ? 'text-xs' : ''}`}>{t('clients.noClients')}</p>
                  ) : (
                    <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
                      {clients.map((client) => (
                        <div
                          key={client.id}
                          className={`flex items-center gap-3 ${isMobile ? 'p-2' : 'p-3'} rounded-lg border border-border hover:bg-muted/50 transition-colors`}
                        >
                          <Checkbox
                            id={`client-${client.id}`}
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={() => handleClientToggle(client.id)}
                            className={isMobile ? 'h-4 w-4' : ''}
                          />
                          <Label
                            htmlFor={`client-${client.id}`}
                            className="flex-1 cursor-pointer min-w-0"
                          >
                            <div className={`font-medium ${isMobile ? 'text-xs' : ''} break-words`}>{client.name}</div>
                            <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-sm'} break-words`}>{client.email}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            )}
          </Card>

          {/* Coaches Section */}
          <Card className={`card-standard ${isMobile ? 'p-0 shadow-none border-0' : ''}`}>
            <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
              <div className={`flex items-center ${isMobile ? 'flex-col items-start gap-2' : 'justify-between'}`}>
                <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  <User className={`text-primary ${isMobile ? 'h-3 w-3' : 'h-5 w-5'}`} />
                  {t('navigation.coaches')} ({selectedCoaches.length}/{coaches.length})
                </CardTitle>
                <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2 w-full' : 'gap-4'}`}>
                  <Button
                    variant="ghost"
                    size={isMobile ? "sm" : "sm"}
                    onClick={() => setShowCoaches(!showCoaches)}
                    className={isMobile ? 'text-xs h-7 px-2' : ''}
                  >
                    {showCoaches ? t('common.buttons.hide', 'Hide') : t('common.buttons.view', 'Show')}
                  </Button>
                  <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                    <Checkbox
                      id="select-all-coaches"
                      checked={selectedCoaches.length === coaches.length && coaches.length > 0}
                      onCheckedChange={handleSelectAllCoaches}
                      className={isMobile ? 'h-4 w-4' : ''}
                    />
                    <Label htmlFor="select-all-coaches" className={`cursor-pointer ${isMobile ? 'text-xs' : ''} break-words`}>
                      {t('common.buttons.selectAll', 'Select All')}
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            {showCoaches && (
              <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
                <ScrollArea className={isMobile ? 'h-[200px] pr-2' : 'h-[300px] pr-4'}>
                  {coaches.length === 0 ? (
                    <p className={`text-muted-foreground text-center py-8 ${isMobile ? 'text-xs' : ''}`}>{t('coaches.noCoaches')}</p>
                  ) : (
                    <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
                      {coaches.map((coach) => (
                        <div
                          key={coach.id}
                          className={`flex items-center gap-3 ${isMobile ? 'p-2' : 'p-3'} rounded-lg border border-border hover:bg-muted/50 transition-colors`}
                        >
                          <Checkbox
                            id={`coach-${coach.id}`}
                            checked={selectedCoaches.includes(coach.id)}
                            onCheckedChange={() => handleCoachToggle(coach.id)}
                            className={isMobile ? 'h-4 w-4' : ''}
                          />
                          <Label
                            htmlFor={`coach-${coach.id}`}
                            className="flex-1 cursor-pointer min-w-0"
                          >
                            <div className={`font-medium ${isMobile ? 'text-xs' : ''} break-words`}>{coach.name}</div>
                            <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-sm'} break-words`}>{coach.email}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Message Section */}
        <div className="lg:col-span-1">
          <Card className={`card-standard ${isMobile ? 'p-0 shadow-none border-0' : 'sticky top-4'}`}>
            <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                <Bell className={`text-primary ${isMobile ? 'h-3 w-3' : 'h-5 w-5'}`} />
                {t('common.labels.message', 'Message')}
              </CardTitle>
            </CardHeader>
            <CardContent className={isMobile ? 'space-y-3 px-2 pb-2' : 'space-y-4'}>
              <div>
                <Label htmlFor="message" className={isMobile ? 'text-xs' : ''}>{t('notes.notificationMessage', 'Notification Message')}</Label>
                <Textarea
                  id="message"
                  placeholder={t('notes.enterMessage', 'Enter your notification message here...')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={isMobile ? 6 : 8}
                  className={`mt-2 ${isMobile ? 'text-xs min-h-[80px]' : ''}`}
                />
                <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                  {message.length} {t('common.labels.characters', 'characters')}
                </p>
              </div>

              <div className={`pt-4 border-t border-border ${isMobile ? 'space-y-1.5' : 'space-y-2'}`}>
                <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="text-muted-foreground">{t('notes.recipients', 'Recipients')}:</span>
                  <span className="font-medium">
                    {selectedClients.length + selectedCoaches.length}
                  </span>
                </div>
                <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="text-muted-foreground">{t('navigation.clients')}:</span>
                  <span className="font-medium">{selectedClients.length}</span>
                </div>
                <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className="text-muted-foreground">{t('navigation.coaches')}:</span>
                  <span className="font-medium">{selectedCoaches.length}</span>
                </div>
              </div>

              <Button
                onClick={handleSendNotification}
                disabled={loading || !message.trim() || (selectedClients.length === 0 && selectedCoaches.length === 0)}
                className={`w-full ${isMobile ? 'text-xs h-8' : ''}`}
                size={isMobile ? "sm" : "default"}
              >
                {loading ? (
                  <>
                    <Loader2 className={`animate-spin ${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
                    {t('common.messages.loading')}
                  </>
                ) : (
                  <>
                    <Send className={isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'} />
                    {t('notes.sendNotification', 'Send Notification')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="archive" className={isMobile ? 'mt-4' : 'mt-6'}>
          <Card className={`card-standard ${isMobile ? 'p-0 shadow-none border-0' : ''}`}>
            <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
              <div className={`flex items-center ${isMobile ? 'flex-col items-start gap-2' : 'justify-between'}`}>
                <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  <Archive className={`text-primary ${isMobile ? 'h-3 w-3' : 'h-5 w-5'}`} />
                  {t('notes.sentNotes', 'Sent Notes')}
                </CardTitle>
                <Button
                  variant="ghost"
                  size={isMobile ? "sm" : "sm"}
                  onClick={fetchSentNotes}
                  disabled={loadingArchive}
                  className={isMobile ? 'text-xs h-7 px-2' : ''}
                >
                  <Loader2 className={`${loadingArchive ? 'animate-spin' : ''} ${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                  {t('common.buttons.refresh', 'Refresh')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className={isMobile ? 'px-2 pb-2' : ''}>
              {loadingArchive ? (
                <div className={`flex items-center justify-center ${isMobile ? 'h-48' : 'h-64'}`}>
                  <div className="text-center">
                    <Loader2 className={`animate-spin mx-auto mb-4 text-primary ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
                    <p className={`text-muted-foreground ${isMobile ? 'text-xs' : ''}`}>{t('common.messages.loading')}</p>
                  </div>
                </div>
              ) : sentNotes.length === 0 ? (
                <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
                  <Archive className={`mx-auto mb-4 text-muted-foreground opacity-50 ${isMobile ? 'h-8 w-8' : 'h-12 w-12'}`} />
                  <p className={`text-muted-foreground ${isMobile ? 'text-xs' : ''}`}>{t('notes.noSentNotes', 'No sent notes yet')}</p>
                </div>
              ) : (
                <ScrollArea className={isMobile ? 'h-[400px]' : 'h-[600px]'}>
                  <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
                    {sentNotes.map((note) => (
                      <Card key={note.groupKey} className={`border-l-4 border-l-primary ${isMobile ? 'p-0 shadow-none' : ''}`}>
                        <CardHeader className={isMobile ? 'pb-2 px-2 pt-2' : 'pb-3'}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium mb-2 whitespace-pre-wrap break-words ${isMobile ? 'text-xs' : 'text-sm'}`}>{note.message}</p>
                              <div className={`flex items-center gap-4 text-muted-foreground flex-wrap ${isMobile ? 'text-[10px] gap-2' : 'text-xs'}`}>
                                <span className="flex items-center gap-1">
                                  <Clock className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                                  {formatDistanceToNow(new Date(note.sentAt), { addSuffix: true })}
                                </span>
                                <Badge variant="outline" className={isMobile ? 'text-[10px] px-1' : ''}>
                                  {note.totalRecipients} {t('notes.recipients', 'recipients')}
                                </Badge>
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <Eye className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                                  {note.readCount} {t('notes.read', 'read')}
                                </span>
                                <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                  <EyeOff className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                                  {note.unreadCount} {t('notes.unread', 'unread')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className={isMobile ? 'pt-0 px-2 pb-2' : 'pt-0'}>
                          <details className="group">
                            <summary className={`cursor-pointer text-muted-foreground hover:text-foreground mb-2 ${isMobile ? 'text-xs' : 'text-sm'} break-words`}>
                              {t('notes.viewRecipients', 'View recipients')} ({note.recipients.length})
                            </summary>
                            <div className={`mt-3 ${isMobile ? 'space-y-1.5' : 'space-y-2'}`}>
                              {note.recipients.map((recipient) => (
                                <div
                                  key={recipient.id}
                                  className={`flex items-center justify-between ${isMobile ? 'p-1.5' : 'p-2'} rounded border ${
                                    recipient.isRead 
                                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                                      : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} break-words`}>{recipient.name}</p>
                                    <p className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'} break-words`}>{recipient.email} • {recipient.role}</p>
                                  </div>
                                  <Badge variant={recipient.isRead ? "default" : "secondary"} className={isMobile ? 'text-[10px] px-1 ml-2' : 'ml-2'}>
                                    {recipient.isRead ? t('notes.read', 'Read') : t('notes.unread', 'Unread')}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </details>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

