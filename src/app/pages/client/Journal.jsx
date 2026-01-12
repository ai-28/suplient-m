"use client"

import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Slider } from "@/app/components/ui/slider";
import { ArrowLeft, Save, Target, TrendingDown, Calendar as CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/app/context/LanguageContext";
import { Calendar } from "@/app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/app/lib/utils";

// Hook to fetch active goals and habits from database
const useGoalsAndHabits = () => {
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoalsAndHabits = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/client/goals');
        const data = await response.json();

        if (data.success) {
          // Filter to only active goals and habits
          const activeGoals = data.goals.filter(g => g.isActive);
          const activeHabits = data.badHabits.filter(h => h.isActive);
          setGoals(activeGoals);
          setHabits(activeHabits);
        } else {
          console.error('Failed to load goals and habits');
          setGoals([]);
          setHabits([]);
        }
      } catch (error) {
        console.error('Error fetching goals and habits:', error);
        setGoals([]);
        setHabits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGoalsAndHabits();
  }, []);

  return { goals, habits, loading };
};

// Helper function to format date in local timezone (YYYY-MM-DD)
// This ensures the date matches what the user selected, regardless of timezone
const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Real useDailyTracking hook with API calls
const useDailyTracking = (goals, habits) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const saveDailyEntry = async (formData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save check-in');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error saving check-in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const getTodayEntry = async (date) => {
    try {
      const response = await fetch(`/api/checkin?date=${date}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch check-in data');
      }

      const result = await response.json();
      return result.checkIn;
    } catch (error) {
      console.error('Error fetching check-in:', error);
      return null;
    }
  };
  
  return { saveDailyEntry, getTodayEntry, isLoading };
};

export default function ClientJournal() {
  const router = useRouter();
  const t = useTranslation();
  const { goals: activeGoals, habits: activeBadHabits, loading: goalsLoading } = useGoalsAndHabits();
  const { saveDailyEntry, getTodayEntry, isLoading } = useDailyTracking(activeGoals, activeBadHabits);
  
  // Selected date for check-in (defaults to today)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoadingEntry, setIsLoadingEntry] = useState(false);
  
  // Initialize form data with dynamic goals and habits
  const initializeFormData = (goals, habits) => {
    const formData = {
      goalScores: {},
      habitScores: {},
      notes: "",
      date: formatDateLocal(new Date()),
    };
    
    // Initialize goal scores (default to 3)
    goals.forEach(goal => {
      formData.goalScores[goal.id] = 3;
    });
    
    // Initialize habit scores (default to 2)
    habits.forEach(habit => {
      formData.habitScores[habit.id] = 2;
    });
    
    return formData;
  };
  
  const [formData, setFormData] = useState(() => initializeFormData(activeGoals, activeBadHabits));
  
  // Update form data when goals/habits are loaded
  useEffect(() => {
    if (!goalsLoading && (activeGoals.length > 0 || activeBadHabits.length > 0)) {
      setFormData(prev => {
        const newFormData = { ...prev };
        
        // Ensure all active goals have scores
        activeGoals.forEach(goal => {
          if (!newFormData.goalScores || newFormData.goalScores[goal.id] === undefined) {
            if (!newFormData.goalScores) newFormData.goalScores = {};
            newFormData.goalScores[goal.id] = 3;
          }
        });
        
        // Ensure all active habits have scores
        activeBadHabits.forEach(habit => {
          if (!newFormData.habitScores || newFormData.habitScores[habit.id] === undefined) {
            if (!newFormData.habitScores) newFormData.habitScores = {};
            newFormData.habitScores[habit.id] = 2;
          }
        });
        
        return newFormData;
      });
    }
  }, [activeGoals, activeBadHabits, goalsLoading]);

  // Load existing check-in data when date changes or goals/habits are loaded
  useEffect(() => {
    const loadEntryForDate = async () => {
      if (!selectedDate) return;
      
      // Don't load if goals/habits are still loading
      if (goalsLoading) return;
      
      // Format date in local timezone to match what user selected
      const dateString = formatDateLocal(selectedDate);
      setIsLoadingEntry(true);
      
      try {
        const existingEntry = await getTodayEntry(dateString);
        
        if (existingEntry) {
          // Load existing data - use JSONB fields
          // Parse JSONB if it's a string (PostgreSQL sometimes returns JSONB as string)
          let goalScores = existingEntry.goalScores || {};
          let habitScores = existingEntry.habitScores || {};
          
          // If goalScores/habitScores are strings, parse them
          if (typeof goalScores === 'string') {
            try {
              goalScores = JSON.parse(goalScores);
            } catch (e) {
              console.error('Error parsing goalScores:', e);
              goalScores = {};
            }
          }
          
          if (typeof habitScores === 'string') {
            try {
              habitScores = JSON.parse(habitScores);
            } catch (e) {
              console.error('Error parsing habitScores:', e);
              habitScores = {};
            }
          }
          
          console.log('📊 Loading check-in data:', {
            date: dateString,
            goalScores,
            habitScores,
            activeGoals: activeGoals.map(g => ({ id: g.id, name: g.name })),
            activeBadHabits: activeBadHabits.map(h => ({ id: h.id, name: h.name }))
          });
          
          // Initialize with defaults for all active goals/habits
          const newGoalScores = {};
          const newHabitScores = {};
          
          activeGoals.forEach(goal => {
            // Try multiple ID formats for matching (UUID object, string, lowercase)
            const goalIdStr = String(goal.id);
            const goalIdLower = goalIdStr.toLowerCase();
            
            // Check all possible ID formats
            let score = goalScores[goal.id];
            if (score === undefined) score = goalScores[goalIdStr];
            if (score === undefined) score = goalScores[goalIdLower];
            // Also check if keys are stored differently
            const goalKeys = Object.keys(goalScores);
            const matchingKey = goalKeys.find(key => 
              String(key).toLowerCase() === goalIdLower
            );
            if (score === undefined && matchingKey) {
              score = goalScores[matchingKey];
            }
            
            // Default to 3 if not found
            if (score === undefined) score = 3;
            
            newGoalScores[goal.id] = score;
            console.log(`Goal ${goal.name} (${goal.id}): score = ${score}`, {
              found: score !== 3,
              goalScoresKeys: Object.keys(goalScores),
              tried: [goal.id, goalIdStr, goalIdLower, matchingKey]
            });
          });
          
          activeBadHabits.forEach(habit => {
            // Try multiple ID formats for matching (UUID object, string, lowercase)
            const habitIdStr = String(habit.id);
            const habitIdLower = habitIdStr.toLowerCase();
            
            // Check all possible ID formats
            let score = habitScores[habit.id];
            if (score === undefined) score = habitScores[habitIdStr];
            if (score === undefined) score = habitScores[habitIdLower];
            // Also check if keys are stored differently
            const habitKeys = Object.keys(habitScores);
            const matchingKey = habitKeys.find(key => 
              String(key).toLowerCase() === habitIdLower
            );
            if (score === undefined && matchingKey) {
              score = habitScores[matchingKey];
            }
            
            // Default to 2 if not found
            if (score === undefined) score = 2;
            
            newHabitScores[habit.id] = score;
            console.log(`Habit ${habit.name} (${habit.id}): score = ${score}`, {
              found: score !== 2,
              habitScoresKeys: Object.keys(habitScores),
              tried: [habit.id, habitIdStr, habitIdLower, matchingKey]
            });
          });
          
          setFormData(prev => ({
            ...prev,
            date: dateString,
            goalScores: newGoalScores,
            habitScores: newHabitScores,
            notes: existingEntry.notes ?? "",
          }));
        } else {
          // Reset to defaults for new date
          const newGoalScores = {};
          const newHabitScores = {};
          
          activeGoals.forEach(goal => {
            newGoalScores[goal.id] = 3;
          });
          
          activeBadHabits.forEach(habit => {
            newHabitScores[habit.id] = 2;
          });
          
          setFormData(prev => ({
            ...prev,
            date: dateString,
            goalScores: newGoalScores,
            habitScores: newHabitScores,
            notes: "",
          }));
        }
      } catch (error) {
        console.error('Error loading entry:', error);
        // Reset to defaults on error
        const newGoalScores = {};
        const newHabitScores = {};
        
        activeGoals.forEach(goal => {
          newGoalScores[goal.id] = 3;
        });
        
        activeBadHabits.forEach(habit => {
          newHabitScores[habit.id] = 2;
        });
        
        setFormData(prev => ({
          ...prev,
          date: dateString,
          goalScores: newGoalScores,
          habitScores: newHabitScores,
        }));
      } finally {
        setIsLoadingEntry(false);
      }
    };

    loadEntryForDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedDate, 
    goalsLoading, 
    // Use stringified IDs to detect when goals/habits change
    JSON.stringify(activeGoals.map(g => g.id).sort()),
    JSON.stringify(activeBadHabits.map(h => h.id).sort())
  ]);

  const handleSave = async () => {
    if (isLoading) return; // Prevent multiple clicks
    
    try {
      // Ensure all IDs are strings for JSONB storage
      const normalizedFormData = {
        ...formData,
        goalScores: Object.fromEntries(
          Object.entries(formData.goalScores || {}).map(([id, score]) => [String(id), score])
        ),
        habitScores: Object.fromEntries(
          Object.entries(formData.habitScores || {}).map(([id, score]) => [String(id), score])
        )
      };
      
      console.log('💾 Saving check-in:', {
        date: normalizedFormData.date,
        goalScores: normalizedFormData.goalScores,
        habitScores: normalizedFormData.habitScores
      });
      
      const result = await saveDailyEntry(normalizedFormData);
      
      // Create activity for daily check-in
      try {
        const activityResponse = await fetch('/api/activities/daily-checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkinData: {
              id: result.checkIn?.id || `checkin-${Date.now()}`,
              responses: formData,
              mood: formData.notes || 'Daily check-in completed'
            }
          }),
        });
        
        if (activityResponse.ok) {
          console.log('✅ Daily check-in activity created');
        } else {
          console.error('❌ Failed to create daily check-in activity');
        }
      } catch (activityError) {
        console.error('❌ Error creating daily check-in activity:', activityError);
      }
      
      // Show different messages based on whether it was inserted or updated
      if (result.isUpdate) {
        toast.success(t('journal.updatedSuccess', "Daily tracking updated successfully! +1 point for engagement"));
      } else {
        toast.success(t('journal.savedSuccess', "Daily tracking saved successfully! +1 point for engagement"));
      }
      
      router.push('/client');
    } catch (error) {
      toast.error(error.message || t('journal.saveFailed', "Failed to save daily tracking"));
      console.error('Error saving daily entry:', error);
    }
  };

  // Helper function to update form data
  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to update goal score
  const updateGoalScore = (goalId, score) => {
    setFormData(prev => ({
      ...prev,
      goalScores: {
        ...prev.goalScores,
        [goalId]: Math.max(0, Math.min(5, score))
      }
    }));
  };

  // Helper function to update habit score
  const updateHabitScore = (habitId, score) => {
    setFormData(prev => ({
      ...prev,
      habitScores: {
        ...prev.habitScores,
        [habitId]: Math.max(0, Math.min(5, score))
      }
    }));
  };

  const getScoreEmoji = (score) => {
    const emojis = ['😔', '😐', '🙂', '😊', '😃', '🤩'];
    return emojis[score] || '🙂';
  };

  const getBadHabitEmoji = (score) => {
    const emojis = ['✅', '🟢', '🟡', '🟠', '🔴', '🚨'];
    return emojis[score] || '🟡';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center p-3 border-b border-border bg-card fixed top-safe left-0 right-0 z-10 safe-x">
        <Button variant="ghost" size="icon" onClick={() => router.push('/client')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="ml-3 text-lg font-semibold">{t('journal.quickCheckIn', 'Quick Daily Check-in')}</h1>
        <div className="ml-auto flex flex-col items-end gap-2">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  "min-w-[140px]"
                )}
                disabled={isLoadingEntry}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "MMM d, yyyy")
                ) : (
                  <span>{t('journal.selectDate', 'Select date')}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                initialFocus
                disabled={(date) => {
                  // Allow past dates, but disable future dates
                  const today = new Date();
                  today.setHours(23, 59, 59, 999);
                  return date > today;
                }}
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={handleSave} disabled={isLoading || isLoadingEntry} size="sm" className="w-full min-w-[140px]">
            <Save className="h-4 w-4 mr-1" />
            {isLoading ? t('common.messages.saving', 'Saving...') : t('common.buttons.save', 'Save')}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6 mt-16 mb-24 safe-x" style={{ 
        marginTop: 'calc(4rem + env(safe-area-inset-top, 0px))',
        marginBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))'
      }}>
        {/* Loading indicator when loading entry */}
        {/* {isLoadingEntry && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">{t('journal.loadingEntry', 'Loading check-in data...')}</p>
            </div>
          </div>
        )} */}
        
        {/* Goals */}
        {goalsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !isLoadingEntry && activeGoals.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{t('journal.goals', 'Goals')}</h2>
            </div>
            
            <div className="space-y-4">
              {activeGoals.map((goal) => {
                const score = formData.goalScores?.[goal.id] ?? 3;
                return (
                  <div key={goal.id} className="bg-card/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{goal.icon || '🎯'}</span>
                        <span className="font-medium">{goal.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getScoreEmoji(score)}</span>
                        <span className="text-lg font-semibold min-w-[20px]">{score}</span>
                      </div>
                    </div>
                    <div className="px-2">
                      <Slider
                        value={[score]}
                        onValueChange={(value) => updateGoalScore(goal.id, value[0])}
                        max={5}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{t('journal.poor', 'Poor')}</span>
                        <span>{t('journal.amazing', 'Amazing')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : !isLoadingEntry && activeGoals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <h3 className="font-semibold">{t('journal.noActiveGoals', 'No Active Goals')}</h3>
            <p className="text-sm mt-2">
              {t('journal.setupGoalsDesc', 'Set up your goals to start quick daily tracking.')}
            </p>
            <Button 
              onClick={() => router.push('/client/profile?tab=goals')} 
              className="mt-4"
              variant="outline"
            >
              {t('journal.setUpGoals', 'Set Up Goals')}
            </Button>
          </div>
        ) : null}

        {/* Bad Habits */}
        {goalsLoading ? null : !isLoadingEntry && activeBadHabits.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <h2 className="font-semibold">{t('journal.reduceThese', 'Reduce These')}</h2>
            </div>
            
            <div className="space-y-4">
              {activeBadHabits.map((habit) => {
                const score = formData.habitScores?.[habit.id] ?? 2;
                return (
                  <div key={habit.id} className="bg-card/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{habit.icon || '📱'}</span>
                        <span className="font-medium">{habit.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getBadHabitEmoji(score)}</span>
                        <span className="text-lg font-semibold min-w-[20px]">{score}</span>
                      </div>
                    </div>
                    <div className="px-2">
                      <Slider
                        value={[score]}
                        onValueChange={(value) => updateHabitScore(habit.id, value[0])}
                        max={5}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{t('journal.none', 'None')}</span>
                        <span>{t('journal.overdidIt', 'Overdid it')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : !isLoadingEntry && activeBadHabits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <h3 className="font-semibold">{t('journal.noActiveHabits', 'No Active Habits')}</h3>
            <p className="text-sm mt-2">
              {t('journal.setupHabitsDesc', 'Set up habits to track in your profile settings.')}
            </p>
            <Button 
              onClick={() => router.push('/client/profile?tab=goals')} 
              className="mt-4"
              variant="outline"
            >
              {t('journal.setUpHabits', 'Set Up Habits')}
            </Button>
          </div>
        ) : null}

        {/* Quick Notes */}
        {!isLoadingEntry && (
          <div className="space-y-3">
            <h2 className="font-semibold">{t('journal.howWasToday', 'How was today?')}</h2>
            <Textarea
              placeholder={t('journal.optionalNote', "Optional quick note about your day...")}
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              className="min-h-[80px] bg-card/50 border-none"
              rows={3}
            />
          </div>
        )}

        {/* Empty State - This section is now always hidden since we have fixed fields */}
        {false && (
          <div className="text-center py-8 space-y-4">
            <Target className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold">{t('journal.noActiveGoals', 'No Active Goals')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('journal.setupGoalsDesc', 'Set up your goals to start quick daily tracking.')}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/client/profile')}
              size="sm"
            >
              {t('journal.setUpGoals', 'Set Up Goals')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}