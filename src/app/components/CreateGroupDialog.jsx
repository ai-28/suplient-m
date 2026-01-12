"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { X, Users, Calendar, Clock, MapPin, Loader2 } from "lucide-react";
import { useClients } from "@/app/hooks/useClients";
import { useTranslation } from "@/app/context/LanguageContext";
import { toast } from "sonner";

export function CreateGroupDialog({ open, onOpenChange, onGroupCreated }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: "",
    focusArea: "",
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const t = useTranslation();
  
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
  
  // Fetch real clients from database
  const { availableClients, loading: clientsLoading, error: clientsError } = useClients();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addMember = (clientId) => {
    const client = availableClients.find(c => c.id.toString() === clientId);
    if (client && !selectedMembers.find(m => m.id === client.id)) {
      setSelectedMembers(prev => [...prev, client]);
    }
  };

  const removeMember = (clientId) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== clientId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.focusArea) {
      toast.error(t('common.messages.error'), {
        description: t('groups.createGroup')
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          capacity: formData.capacity,
          focusArea: formData.focusArea,
          selectedMembers: selectedMembers.map(member => member.id), // Include selected member IDs
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create group");
      }
      
      // Show success message
      toast.success(t('groups.groupCreated'), {
        description: `${formData.name}`
      });
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        capacity: "",
        focusArea: "",
      });
      setSelectedMembers([]);
      onOpenChange(false);
      
      // Call callback to refresh groups list
      if (onGroupCreated) {
        onGroupCreated(result.group);
      }
      
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(t('common.messages.operationFailed'), {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-full mx-2' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader className={isMobile ? 'pb-2' : ''}>
          <DialogTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-2xl'} break-words`}>
            <Users className={isMobile ? 'h-4 w-4' : 'h-6 w-6'} />
            <span className="break-words min-w-0 flex-1">{t('groups.createGroup')}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className={isMobile ? 'space-y-3' : 'space-y-6'}>
          {/* Basic Information */}
          <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
            <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground break-words`}>{t('common.labels.description')}</h3>
            
            <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} ${isMobile ? 'gap-2' : 'gap-4'}`}>
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                <Label htmlFor="name" className={isMobile ? 'text-xs' : ''}>{t('groups.createGroup')} *</Label>
                <Input
                  id="name"
                  placeholder={t('groups.createGroup')}
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                  className={isMobile ? 'text-xs h-8' : ''}
                />
              </div>
              
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                <Label htmlFor="focusArea" className={isMobile ? 'text-xs' : ''}>{t('common.labels.status')} *</Label>
                <Select onValueChange={(value) => handleInputChange("focusArea", value)}>
                  <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                    <SelectValue placeholder={t('common.labels.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anxiety">{t('groups.focusAreas.anxiety', 'Anxiety Management')}</SelectItem>
                    <SelectItem value="depression">{t('groups.focusAreas.depression', 'Depression Support')}</SelectItem>
                    <SelectItem value="trauma">{t('groups.focusAreas.trauma', 'Trauma Recovery')}</SelectItem>
                    <SelectItem value="addiction">{t('groups.focusAreas.addiction', 'Addiction Recovery')}</SelectItem>
                    <SelectItem value="grief">{t('groups.focusAreas.grief', 'Grief & Loss')}</SelectItem>
                    <SelectItem value="relationships">{t('groups.focusAreas.relationships', 'Relationship Issues')}</SelectItem>
                    <SelectItem value="mindfulness">{t('groups.focusAreas.mindfulness', 'Mindfulness & Meditation')}</SelectItem>
                    <SelectItem value="anger">{t('groups.focusAreas.anger', 'Anger Management')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
              <Label htmlFor="description" className={isMobile ? 'text-xs' : ''}>{t('common.labels.description')}</Label>
              <Textarea
                id="description"
                placeholder={t('common.labels.description')}
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={isMobile ? 2 : 3}
                className={isMobile ? 'text-xs' : ''}
              />
            </div>
          </div>

          {/* Group Settings */}
          <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
            <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground break-words`}>{t('settings.title')}</h3>
            
            <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-3'} ${isMobile ? 'gap-2' : 'gap-4'}`}>
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                <Label htmlFor="capacity" className={isMobile ? 'text-xs' : ''}>{t('groups.groupMembers')}</Label>
                <Select onValueChange={(value) => handleInputChange("capacity", value)}>
                  <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                    <SelectValue placeholder={t('common.labels.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4-6">4-6 {t('groups.members')}</SelectItem>
                    <SelectItem value="6-8">6-8 {t('groups.members')}</SelectItem>
                    <SelectItem value="8-10">8-10 {t('groups.members')}</SelectItem>
                    <SelectItem value="10-12">10-12 {t('groups.members')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Member Selection */}
          <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
            <h3 className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-foreground break-words`}>{t('groups.addMember')}</h3>
            
            <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
              <Label className={isMobile ? 'text-xs' : ''}>{t('clients.title')}</Label>
              {clientsLoading ? (
                <div className={`flex items-center justify-center ${isMobile ? 'p-2' : 'p-4'}`}>
                  <div className={`${isMobile ? 'text-xs' : ''} text-muted-foreground`}>{t('common.messages.loading')}</div>
                </div>
              ) : clientsError ? (
                <div className={`flex items-center justify-center ${isMobile ? 'p-2' : 'p-4'}`}>
                  <div className={`${isMobile ? 'text-xs' : ''} text-destructive break-words`}>{t('common.messages.error')}: {clientsError}</div>
                </div>
              ) : availableClients.length === 0 ? (
                <div className={`flex items-center justify-center ${isMobile ? 'p-2' : 'p-4'}`}>
                  <div className={`${isMobile ? 'text-xs' : ''} text-muted-foreground break-words`}>{t('clients.noClients')}</div>
                </div>
              ) : (
                <Select onValueChange={addMember}>
                  <SelectTrigger className={isMobile ? 'text-xs h-8' : ''}>
                    <SelectValue placeholder={t('groups.addMember')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients
                      .filter(client => !selectedMembers.find(m => m.id === client.id))
                      .map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedMembers.length > 0 && (
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                <Label className={isMobile ? 'text-xs' : ''}>{t('groups.groupMembers')} ({selectedMembers.length})</Label>
                <div className={`flex flex-wrap ${isMobile ? 'gap-1' : 'gap-2'}`}>
                  {selectedMembers.map((member) => (
                    <Badge
                      key={member.id}
                      variant="secondary"
                      className={`flex items-center gap-2 ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-2'}`}
                    >
                      <Avatar className={isMobile ? 'h-4 w-4' : 'h-5 w-5'}>
                        <AvatarFallback className={isMobile ? 'text-[10px]' : 'text-xs'}>
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="break-words">{member.name}</span>
                      <button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        className="hover:text-destructive"
                      >
                        <X className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-end gap-3'} ${isMobile ? 'pt-2' : 'pt-4'} border-t`}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className={`disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'w-full text-xs h-8' : ''}`}
              size={isMobile ? "sm" : "default"}
            >
              {t('common.buttons.cancel')}
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={isLoading}
              className={`disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'w-full text-xs h-8' : ''}`}
              size={isMobile ? "sm" : "default"}
            >
              {isLoading ? (
                <>
                  <Loader2 className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                  {t('common.messages.loading')}
                </>
              ) : (
                <>
                  <Users className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                  {t('groups.createGroup')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}