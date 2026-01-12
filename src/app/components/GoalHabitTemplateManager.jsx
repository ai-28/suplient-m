"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { Target, TrendingDown, Plus, Trash2, Edit2, Loader2, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/app/context/LanguageContext';
import { IconPicker } from '@/app/components/IconPicker';
import { ColorPicker } from '@/app/components/ColorPicker';
import { Switch } from "@/app/components/ui/switch";

export function GoalHabitTemplateManager() {
  const t = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Dialog states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateItems, setTemplateItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState(null);

  // Add item dialog state
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [newItemType, setNewItemType] = useState('goal');
  const [newItemName, setNewItemName] = useState("");
  const [newItemIcon, setNewItemIcon] = useState("🎯");
  const [newItemColor, setNewItemColor] = useState("#3B82F6");

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

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/coach/templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
      } else {
        toast.error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTemplateDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.name);
      setTemplateDescription(template.description || "");
      setTemplateItems(template.items || []);
    } else {
      setEditingTemplate(null);
      setTemplateName("");
      setTemplateDescription("");
      setTemplateItems([]);
    }
    setShowTemplateDialog(true);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    const newItem = {
      id: `temp-${Date.now()}`,
      type: newItemType,
      name: newItemName.trim(),
      icon: newItemIcon,
      color: newItemColor,
      order: templateItems.length + 1
    };

    setTemplateItems([...templateItems, newItem]);
    setNewItemName("");
    setNewItemIcon(newItemType === 'goal' ? "🎯" : "📱");
    setNewItemColor(newItemType === 'goal' ? "#3B82F6" : "#EF4444");
    setShowAddItemDialog(false);
  };

  const handleRemoveItem = (itemId) => {
    setTemplateItems(templateItems.filter(item => item.id !== itemId));
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (templateItems.length === 0) {
      toast.error('Please add at least one goal or habit to the template');
      return;
    }

    try {
      setSaving(true);
      const url = '/api/coach/templates';
      const method = editingTemplate ? 'PUT' : 'POST';
      const body = {
        ...(editingTemplate && { id: editingTemplate.id }),
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        items: templateItems.map(item => ({
          type: item.type,
          name: item.name,
          icon: item.icon,
          color: item.color,
          order: item.order
        }))
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!');
        setShowTemplateDialog(false);
        fetchTemplates();
      } else {
        throw new Error(data.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplateId) return;

    try {
      const response = await fetch(`/api/coach/templates?id=${deletingTemplateId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Template deleted successfully!');
        setDeletingTemplateId(null);
        fetchTemplates();
      } else {
        throw new Error(data.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Failed to delete template');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Loading templates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={isMobile ? 'space-y-3' : 'space-y-6'}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
            Goal & Habit Templates
          </h3>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mt-1`}>
            Create reusable templates for goals and habits that can be applied to clients
          </p>
        </div>
        <Button onClick={() => handleOpenTemplateDialog()} size={isMobile ? "sm" : "default"}>
          <Plus className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
          {isMobile ? 'New' : 'New Template'}
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No templates created yet</p>
              <Button onClick={() => handleOpenTemplateDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={`${isMobile ? 'space-y-3' : 'space-y-4'} max-h-[500px] overflow-y-auto pr-2`}>
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className={isMobile ? 'px-3 py-3' : ''}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className={isMobile ? 'text-sm' : ''}>{template.name}</CardTitle>
                    </div>
                    {template.description && (
                      <CardDescription className={isMobile ? 'text-xs mt-1' : 'mt-1'}>
                        {template.description}
                      </CardDescription>
                    )}
                    <div className={`flex items-center gap-4 mt-2 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                      <span>
                        {template.items.filter(i => i.type === 'goal').length} Goals
                      </span>
                      <span>
                        {template.items.filter(i => i.type === 'habit').length} Habits
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size={isMobile ? "sm" : "icon"}
                      onClick={() => handleOpenTemplateDialog(template)}
                    >
                      <Edit2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                    </Button>
                    <Button
                      variant="ghost"
                      size={isMobile ? "sm" : "icon"}
                      onClick={() => setDeletingTemplateId(template.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className={isMobile ? 'max-w-[95vw] max-h-[90vh] overflow-y-auto' : 'max-w-2xl max-h-[90vh] overflow-y-auto'}>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Define a set of goals and habits that can be applied to clients
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Weight Loss Program"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Optional description for this template"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Goals & Habits ({templateItems.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddItemDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {templateItems.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/20">
                  <p className="text-sm text-muted-foreground">No items added yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {templateItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20"
                    >
                      <div className={`text-lg`}>{item.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.type === 'goal' ? 'Goal' : 'Habit'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'Update' : 'Create'} Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog} modal={true}>
        <DialogContent 
          className={isMobile ? 'max-w-[95vw]' : ''}
          onInteractOutside={(e) => {
            // Prevent closing when clicking on popover content
            const target = e.target;
            if (target && target.closest && (target.closest('[role="dialog"]') || target.closest('[data-radix-popper-content-wrapper]'))) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Add Goal or Habit</DialogTitle>
            <DialogDescription>
              Add a goal or habit to this template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Type *</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={newItemType === 'goal' ? 'default' : 'outline'}
                  onClick={() => {
                    setNewItemType('goal');
                    setNewItemIcon('🎯');
                    setNewItemColor('#3B82F6');
                  }}
                  className="flex-1"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Goal
                </Button>
                <Button
                  type="button"
                  variant={newItemType === 'habit' ? 'default' : 'outline'}
                  onClick={() => {
                    setNewItemType('habit');
                    setNewItemIcon('📱');
                    setNewItemColor('#EF4444');
                  }}
                  className="flex-1"
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Habit
                </Button>
              </div>
            </div>

            <div>
              <Label>Name *</Label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={newItemType === 'goal' ? "e.g., Meditation Practice" : "e.g., Late Night Snacking"}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Icon</Label>
              <div onClick={(e) => e.stopPropagation()}>
                <IconPicker
                  value={newItemIcon}
                  onChange={setNewItemIcon}
                  placeholder={newItemType === 'goal' ? "🎯" : "📱"}
                />
              </div>
            </div>

            <div>
              <Label>Color</Label>
              <div onClick={(e) => e.stopPropagation()}>
                <ColorPicker
                  value={newItemColor}
                  onChange={setNewItemColor}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTemplateId} onOpenChange={(open) => !open && setDeletingTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GoalHabitTemplateManager;

