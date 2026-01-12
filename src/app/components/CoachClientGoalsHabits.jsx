"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Target, TrendingDown, Plus, Trash2, Loader2, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/app/context/LanguageContext';
import { IconPicker } from '@/app/components/IconPicker';
import { ColorPicker } from '@/app/components/ColorPicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";

export function CoachClientGoalsHabits({ clientId }) {
  const t = useTranslation();
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Add goal/habit dialog state
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false);
  const [showAddHabitDialog, setShowAddHabitDialog] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalIcon, setNewGoalIcon] = useState("🎯");
  const [newGoalColor, setNewGoalColor] = useState("#3B82F6");
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("📱");
  const [newHabitColor, setNewHabitColor] = useState("#EF4444");
  const [saving, setSaving] = useState(false);

  // Template states
  const [templates, setTemplates] = useState([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [applyMode, setApplyMode] = useState('merge');
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // Fetch goals and habits
  useEffect(() => {
    const fetchGoalsAndHabits = async () => {
      if (!clientId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/coach/clients/${clientId}/goals`);
        const data = await response.json();

        if (data.success) {
          setGoals(data.goals);
          setHabits(data.badHabits);
        } else {
          setError('Failed to load goals and habits');
        }
      } catch (err) {
        console.error('Error fetching goals and habits:', err);
        setError('Failed to load goals and habits');
      } finally {
        setLoading(false);
      }
    };

    fetchGoalsAndHabits();
  }, [clientId]);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/coach/templates');
        const data = await response.json();

        if (data.success) {
          setTemplates(data.templates);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
      }
    };

    fetchTemplates();
  }, []);

  const handleToggleGoal = async (goalId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    try {
      const response = await fetch(`/api/coach/clients/${clientId}/goals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goalId,
          type: 'goal',
          isActive: !goal.isActive
        })
      });

      const data = await response.json();
      if (data.success) {
        setGoals(prev => prev.map(g => 
          g.id === goalId ? { ...g, isActive: !g.isActive } : g
        ));
        toast.success("Goal updated successfully!");
      } else {
        throw new Error(data.error || 'Failed to update goal');
      }
    } catch (error) {
      toast.error(error.message || "Failed to update goal");
    }
  };

  const handleToggleHabit = async (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    try {
      const response = await fetch(`/api/coach/clients/${clientId}/goals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: habitId,
          type: 'habit',
          isActive: !habit.isActive
        })
      });

      const data = await response.json();
      if (data.success) {
        setHabits(prev => prev.map(h => 
          h.id === habitId ? { ...h, isActive: !h.isActive } : h
        ));
        toast.success("Habit updated successfully!");
      } else {
        throw new Error(data.error || 'Failed to update habit');
      }
    } catch (error) {
      toast.error(error.message || "Failed to update habit");
    }
  };

  const handleAddGoal = async () => {
    if (!newGoalName.trim()) {
      toast.error("Please enter a goal name");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/coach/clients/${clientId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'goal',
          name: newGoalName.trim(),
          icon: newGoalIcon || '🎯',
          color: newGoalColor || '#3B82F6'
        })
      });

      const data = await response.json();
      if (data.success) {
        setGoals(prev => [...prev, data.goal]);
        setNewGoalName("");
        setNewGoalIcon("🎯");
        setNewGoalColor("#3B82F6");
        setShowAddGoalDialog(false);
        toast.success("Goal added successfully!");
      } else {
        throw new Error(data.error || 'Failed to add goal');
      }
    } catch (error) {
      toast.error(error.message || "Failed to add goal");
    } finally {
      setSaving(false);
    }
  };

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) {
      toast.error("Please enter a habit name");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/coach/clients/${clientId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'habit',
          name: newHabitName.trim(),
          icon: newHabitIcon || '📱',
          color: newHabitColor || '#EF4444'
        })
      });

      const data = await response.json();
      if (data.success) {
        setHabits(prev => [...prev, data.habit]);
        setNewHabitName("");
        setNewHabitIcon("📱");
        setNewHabitColor("#EF4444");
        setShowAddHabitDialog(false);
        toast.success("Habit added successfully!");
      } else {
        throw new Error(data.error || 'Failed to add habit');
      }
    } catch (error) {
      toast.error(error.message || "Failed to add habit");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId, goalName) => {
    try {
      const response = await fetch(`/api/coach/clients/${clientId}/goals?id=${goalId}&type=goal`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setGoals(prev => prev.filter(goal => goal.id !== goalId));
        toast.success(`"${goalName}" deleted successfully!`);
      } else {
        throw new Error(data.error || 'Failed to delete goal');
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete goal");
    }
  };

  const handleDeleteHabit = async (habitId, habitName) => {
    try {
      const response = await fetch(`/api/coach/clients/${clientId}/goals?id=${habitId}&type=habit`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setHabits(prev => prev.filter(habit => habit.id !== habitId));
        toast.success(`"${habitName}" deleted successfully!`);
      } else {
        throw new Error(data.error || 'Failed to delete habit');
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete habit");
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    try {
      setApplyingTemplate(true);
      const response = await fetch(`/api/coach/clients/${clientId}/goals/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          mode: applyMode
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Template applied successfully!');
        setShowTemplateDialog(false);
        setSelectedTemplateId(null);
        setApplyMode('merge');
        
        // Refresh goals and habits
        const refreshResponse = await fetch(`/api/coach/clients/${clientId}/goals`);
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setGoals(refreshData.goals);
          setHabits(refreshData.badHabits);
        }
      } else {
        throw new Error(data.error || 'Failed to apply template');
      }
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error(error.message || "Failed to apply template");
    } finally {
      setApplyingTemplate(false);
    }
  };

  if (loading) {
    return (
      <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
        <CardContent className={isMobile ? 'p-2' : 'p-6'}>
          <div className={`flex items-center justify-center ${isMobile ? 'py-4' : 'py-8'}`}>
            <Loader2 className={isMobile ? 'h-4 w-4' : 'h-6 w-6'} />
            <span className={`${isMobile ? 'text-xs ml-1' : 'text-sm ml-2'} text-muted-foreground`}>Loading goals and habits...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
        <CardContent className={isMobile ? 'p-2' : 'p-6'}>
          <div className={`text-center ${isMobile ? 'py-4' : 'py-8'} text-red-500`}>
            <p className={isMobile ? 'text-xs break-words' : 'text-sm'}>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={isMobile ? 'space-y-3' : 'space-y-6'}>
      {/* Template Selector */}
      {templates.length > 0 && (
        <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
          <CardContent className={isMobile ? 'px-2 pb-2 pt-2' : 'p-4'}>
            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between gap-4'}`}>
              <div className={isMobile ? 'w-full' : 'flex-1'}>
                <Label className={isMobile ? 'text-xs' : ''}>Apply Template</Label>
                <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-1`}>
                  Apply a pre-defined template of goals and habits
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowTemplateDialog(true)}
                size={isMobile ? "sm" : "default"}
                className={isMobile ? 'w-full text-xs' : ''}
              >
                <FileText className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
                {isMobile ? 'Apply Template' : 'Apply Template'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals Section */}
      <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
        <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
          <div className={`flex items-center ${isMobile ? 'flex-wrap gap-1' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              <Target className={isMobile ? 'h-3 w-3' : 'h-5 w-5'} />
              <CardTitle className={isMobile ? 'text-sm' : ''}>Life Area Goals</CardTitle>
            </div>
            <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>
              {goals.filter(g => g.isActive).length} / {goals.length} active
            </Badge>
          </div>
          <CardDescription className={isMobile ? 'text-xs hidden' : ''}>
            Manage client's goals for daily tracking
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'px-2 pb-2 space-y-2' : 'space-y-4'}>
          <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
            {goals.map((goal) => (
              <div key={goal.id} className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} ${isMobile ? 'p-2' : 'p-4'} border rounded-lg gap-2`}>
                <div className={`flex items-center ${isMobile ? 'w-full' : 'gap-4'} flex-1 min-w-0`}>
                  <div className={isMobile ? 'text-lg' : 'text-2xl'}>{goal.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center ${isMobile ? 'flex-wrap gap-1' : 'gap-2'} mb-1`}>
                      <h3 className={`${isMobile ? 'text-xs' : ''} font-medium break-words flex-1 min-w-0`}>{goal.name}</h3>
                      {goal.isCustom && (
                        <Badge variant="secondary" className={isMobile ? 'text-[10px] px-1' : 'text-xs'}>Custom</Badge>
                      )}
                      {goal.isDefault && (
                        <Badge variant="outline" className={isMobile ? 'text-[10px] px-1' : 'text-xs'}>Default</Badge>
                      )}
                    </div>
                    {goal.isActive && (
                      <div className={isMobile ? 'mt-1' : 'mt-2'}>
                        <div className={`flex items-center gap-2 text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                          <span className="whitespace-nowrap">Current: {goal.currentScore}/5</span>
                          <div className={`bg-secondary rounded-full ${isMobile ? 'w-12' : 'w-16'} h-1 flex-1`}>
                            <div 
                              className="rounded-full h-1 transition-all"
                              style={{ 
                                width: `${(goal.currentScore / 5) * 100}%`,
                                backgroundColor: goal.color
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-end' : ''}`}>
                  {goal.isCustom && (
                    <Button
                      variant="ghost"
                      size={isMobile ? "sm" : "icon"}
                      onClick={() => handleDeleteGoal(goal.id, goal.name)}
                      className={`text-destructive hover:text-destructive ${isMobile ? 'h-7 w-7 p-0' : 'h-8 w-8'}`}
                    >
                      <Trash2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                    </Button>
                  )}
                  <Switch
                    checked={goal.isActive}
                    onCheckedChange={() => handleToggleGoal(goal.id)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Goal */}
          {!showAddGoalDialog ? (
            <Button 
              variant="outline" 
              onClick={() => setShowAddGoalDialog(true)}
              className={`w-full ${isMobile ? 'text-xs h-8' : ''}`}
              size={isMobile ? "sm" : "default"}
            >
              <Plus className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
              Add Goal
            </Button>
          ) : (
            <div className={`space-y-3 ${isMobile ? 'p-2 space-y-2' : 'p-4'} border rounded-lg bg-muted/20`}>
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                <Label className={isMobile ? 'text-xs' : ''}>Goal Name</Label>
                <Input
                  placeholder="e.g., Meditation Practice"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className={isMobile ? 'text-xs h-8' : ''}
                />
              </div>
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                <Label className={isMobile ? 'text-xs' : ''}>Icon</Label>
                <IconPicker
                  value={newGoalIcon}
                  onChange={setNewGoalIcon}
                  placeholder="🎯"
                />
              </div>
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                <Label className={isMobile ? 'text-xs' : ''}>Color</Label>
                <ColorPicker
                  value={newGoalColor}
                  onChange={setNewGoalColor}
                />
              </div>
              <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                <Button onClick={handleAddGoal} size={isMobile ? "sm" : "sm"} disabled={saving} className={isMobile ? 'w-full text-xs h-8' : ''}>
                  {saving ? <Loader2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} /> : null}
                  {saving && !isMobile && <span className="mr-2" />}
                  Add Goal
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddGoalDialog(false);
                    setNewGoalName("");
                    setNewGoalIcon("🎯");
                    setNewGoalColor("#3B82F6");
                  }}
                  size={isMobile ? "sm" : "sm"}
                  className={isMobile ? 'w-full text-xs h-8' : ''}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Habits Section */}
      <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
        <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
          <div className={`flex items-center ${isMobile ? 'flex-wrap gap-1' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              <TrendingDown className={isMobile ? 'h-3 w-3' : 'h-5 w-5'} />
              <CardTitle className={isMobile ? 'text-sm' : ''}>Habits to Reduce</CardTitle>
            </div>
            <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>
              {habits.filter(h => h.isActive).length} / {habits.length} active
            </Badge>
          </div>
          <CardDescription className={isMobile ? 'text-xs hidden' : ''}>
            Manage client's habits for daily tracking
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'px-2 pb-2 space-y-2' : 'space-y-4'}>
          <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
            {habits.map((habit) => (
              <div key={habit.id} className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} ${isMobile ? 'p-2' : 'p-4'} border rounded-lg gap-2`}>
                <div className={`flex items-center ${isMobile ? 'w-full' : 'gap-4'} flex-1 min-w-0`}>
                  <div className={isMobile ? 'text-lg' : 'text-2xl'}>{habit.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center ${isMobile ? 'flex-wrap gap-1' : 'gap-2'} mb-1`}>
                      <h3 className={`${isMobile ? 'text-xs' : ''} font-medium break-words flex-1 min-w-0`}>{habit.name}</h3>
                      {habit.isCustom && (
                        <Badge variant="secondary" className={isMobile ? 'text-[10px] px-1' : 'text-xs'}>Custom</Badge>
                      )}
                      {habit.isDefault && (
                        <Badge variant="outline" className={isMobile ? 'text-[10px] px-1' : 'text-xs'}>Default</Badge>
                      )}
                    </div>
                    {habit.isActive && (
                      <div className={isMobile ? 'mt-1' : 'mt-2'}>
                        <div className={`flex items-center gap-2 text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                          <span className="whitespace-nowrap">Current: {habit.currentScore}/5</span>
                          <div className={`bg-secondary rounded-full ${isMobile ? 'w-12' : 'w-16'} h-1 flex-1`}>
                            <div 
                              className="rounded-full h-1 transition-all"
                              style={{ 
                                width: `${(habit.currentScore / 5) * 100}%`,
                                backgroundColor: habit.color
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-end' : ''}`}>
                  {habit.isCustom && (
                    <Button
                      variant="ghost"
                      size={isMobile ? "sm" : "icon"}
                      onClick={() => handleDeleteHabit(habit.id, habit.name)}
                      className={`text-destructive hover:text-destructive ${isMobile ? 'h-7 w-7 p-0' : 'h-8 w-8'}`}
                    >
                      <Trash2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                    </Button>
                  )}
                  <Switch
                    checked={habit.isActive}
                    onCheckedChange={() => handleToggleHabit(habit.id)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Habit */}
          {!showAddHabitDialog ? (
            <Button 
              variant="outline" 
              onClick={() => setShowAddHabitDialog(true)}
              className={`w-full ${isMobile ? 'text-xs h-8' : ''}`}
              size={isMobile ? "sm" : "default"}
            >
              <Plus className={isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} />
              Add Habit
            </Button>
          ) : (
            <div className={`space-y-3 ${isMobile ? 'p-2 space-y-2' : 'p-4'} border rounded-lg bg-muted/20`}>
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                <Label className={isMobile ? 'text-xs' : ''}>Habit Name</Label>
                <Input
                  placeholder="e.g., Late Night Snacking"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className={isMobile ? 'text-xs h-8' : ''}
                />
              </div>
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                <Label className={isMobile ? 'text-xs' : ''}>Icon</Label>
                <IconPicker
                  value={newHabitIcon}
                  onChange={setNewHabitIcon}
                  placeholder="📱"
                />
              </div>
              <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                <Label className={isMobile ? 'text-xs' : ''}>Color</Label>
                <ColorPicker
                  value={newHabitColor}
                  onChange={setNewHabitColor}
                />
              </div>
              <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                <Button onClick={handleAddHabit} size={isMobile ? "sm" : "sm"} disabled={saving} className={isMobile ? 'w-full text-xs h-8' : ''}>
                  {saving ? <Loader2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} /> : null}
                  {saving && !isMobile && <span className="mr-2" />}
                  Add Habit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddHabitDialog(false);
                    setNewHabitName("");
                    setNewHabitIcon("📱");
                    setNewHabitColor("#EF4444");
                  }}
                  size={isMobile ? "sm" : "sm"}
                  className={isMobile ? 'w-full text-xs h-8' : ''}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className={isMobile ? 'max-w-[95vw]' : ''}>
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>
              Select a template to apply goals and habits to this client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Template *</Label>
              <Select value={selectedTemplateId || ""} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          ({template.items.filter(i => i.type === 'goal').length} goals, {template.items.filter(i => i.type === 'habit').length} habits)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateId && (
              <div>
                <Label>Apply Mode *</Label>
                <RadioGroup value={applyMode} onValueChange={setApplyMode} className="mt-2">
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge" className="flex-1 cursor-pointer">
                      <div className="font-medium">Merge with existing</div>
                      <div className="text-xs text-muted-foreground">
                        Keep current goals/habits and add new ones from template
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="flex-1 cursor-pointer">
                      <div className="font-medium">Replace all existing</div>
                      <div className="text-xs text-muted-foreground">
                        Remove all current goals/habits and apply template
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTemplateDialog(false);
              setSelectedTemplateId(null);
              setApplyMode('merge');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplyTemplate} 
              disabled={!selectedTemplateId || applyingTemplate}
            >
              {applyingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CoachClientGoalsHabits;

