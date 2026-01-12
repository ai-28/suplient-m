import React from 'react';
import { Flame, Trophy, Target, Info } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { useTranslation } from '@/app/context/LanguageContext';

export function StreakCounter({ 
  streak, 
  totalPoints, 
  level, 
  pointsToNextLevel, 
  activeMilestone,
  recentMilestone 
}) {
  const t = useTranslation();

  const levelProgress = ((level * 100 - pointsToNextLevel) / (level * 100)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-2.5 bg-card rounded-lg border">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold text-foreground">{streak}</span>
          <span className="text-sm font-medium text-foreground">{t('streak.dayStreak', 'day streak')}</span>
          <Popover>
            <PopoverTrigger asChild>
              <button 
                type="button"
                className="cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                aria-label={t('streak.streakTitle', 'Daily Streak info')}
              >
                <Info className="w-3 h-3 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="max-w-xs">
              <p className="font-semibold mb-1">{t('streak.streakTitle', 'Daily Streak')}</p>
              <p className="text-xs">{t('streak.streakDescription', 'Your consecutive days of completing daily check-ins. Complete a check-in each day to maintain your streak!')}</p>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-foreground">{totalPoints} {t('streak.points', 'Points')}</span>
          <Popover>
            <PopoverTrigger asChild>
              <button 
                type="button"
                className="cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                aria-label={t('streak.pointsTitle', 'Engagement Points info')}
              >
                <Info className="w-3 h-3 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="max-w-xs">
              <p className="font-semibold mb-1">{t('streak.pointsTitle', 'Engagement Points')}</p>
              <p className="text-xs">{t('streak.pointsDescription', 'Earn 1 point for each: daily check-ins, completed tasks, viewed resources, and attended sessions. Points help you level up and track your progress!')}</p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-1.5">
          <Target className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-foreground">{t('streak.level', 'Level')} {level}</span>
          <Popover>
            <PopoverTrigger asChild>
              <button 
                type="button"
                className="cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                aria-label={t('streak.levelTitle', 'Level info')}
              >
                <Info className="w-3 h-3 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="max-w-xs">
              <p className="font-semibold mb-1">{t('streak.levelTitle', 'Level')}</p>
              <p className="text-xs">{t('streak.levelDescription', 'Level up every 100 points! Your level shows your overall engagement and progress. Keep earning points to reach the next level.')}</p>
            </PopoverContent>
          </Popover>
        </div>
        
          {recentMilestone && (
            <Badge variant="default" className="text-xs bg-green-500 text-white animate-pulse">
              {recentMilestone.title}
            </Badge>
          )}
        </div>
      
      {activeMilestone && (
        <div className="px-2.5">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
            <span>{t('streak.next', 'Next')}: {activeMilestone.title}</span>
            <span>{activeMilestone.streak - streak} {t('streak.daysToGo', 'days to go')}</span>
          </div>
          <Progress value={((streak / activeMilestone.streak) * 100)} className="h-1" />
        </div>
      )}
      
      <div className="px-2.5">
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
          <span>{t('streak.level', 'Level')} {level} {t('streak.progress', 'Progress')}</span>
          <span>{pointsToNextLevel} {t('streak.points', 'Points')} {t('streak.toLevel', 'to Level')} {level + 1}</span>
        </div>
        <Progress value={levelProgress} className="h-1" />
      </div>
    </div>
  );
}