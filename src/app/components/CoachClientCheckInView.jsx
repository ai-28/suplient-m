"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/app/lib/utils";
import { useTranslation } from "@/app/context/LanguageContext";
import PolarAreaChart from "./PolarAreaChart";

// Helper function to format date in local timezone (YYYY-MM-DD)
const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function CoachClientCheckInView({ clientId }) {
  const t = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activePeriod, setActivePeriod] = useState('today');
  const [checkInData, setCheckInData] = useState(null);
  const [loading, setLoading] = useState(false);
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

  // Fetch check-in data when date or period changes
  useEffect(() => {
    const fetchCheckInData = async () => {
      if (!clientId) return;

      setLoading(true);
      setError(null);

      try {
        const dateStr = formatDateLocal(selectedDate);
        const response = await fetch(`/api/coach/clients/${clientId}/checkin?date=${dateStr}&period=${activePeriod}`);

        if (!response.ok) {
          throw new Error('Failed to fetch check-in data');
        }

        const data = await response.json();
        setCheckInData(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching check-in data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckInData();
  }, [clientId, selectedDate, activePeriod]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  // Prepare data for Polar Area Chart (goals only)
  const polarData = checkInData?.goalDistribution ? {
    labels: checkInData.goalDistribution.map(item => item.name),
    datasets: [
      {
        label: 'Goal Performance',
        data: checkInData.goalDistribution.map(item => item.value),
        backgroundColor: checkInData.goalDistribution.map(item => item.color + '80'),
        borderColor: '#ffffff',
        borderWidth: 1,
      },
    ],
  } : null;

  const polarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = activePeriod === 'today' 
              ? context.parsed.r 
              : context.parsed.r.toFixed(1);
            return `${context.label}: ${value} / 5`;
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
          color: 'hsl(var(--muted-foreground))',
          font: {
            size: 12
          },
          display: true,
        },
        grid: {
          color: '#e5e7eb',
          lineWidth: 1
        },
        pointLabels: {
          color: 'hsl(var(--muted-foreground))',
          font: {
            size: 12
          }
        }
      }
    }
  };

  return (
    <Card className={isMobile ? 'p-0 shadow-none border-0' : ''}>
      <CardHeader className={isMobile ? 'px-2 pb-2 pt-2' : ''}>
        <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
          <CalendarIcon className={isMobile ? 'h-3 w-3' : 'h-5 w-5'} />
          {t('clients.dailyCheckIn', 'Daily Check-in')}
        </CardTitle>
        <CardDescription className={isMobile ? 'text-xs hidden' : ''}>
          {activePeriod === 'today' 
            ? t('clients.viewClientDailyTracking', 'View client\'s daily check-in metrics and notes')
            : t('clients.viewClientPeriodTracking', `View client's ${activePeriod} average check-in metrics`)
          }
        </CardDescription>
      </CardHeader>
      <CardContent className={`space-y-6 ${isMobile ? 'px-2 pb-2 space-y-3' : ''}`}>
        {/* Date Selector */}
        <div className={`flex items-center justify-center gap-2 ${isMobile ? 'p-2' : 'p-4'} bg-muted/30 rounded-lg ${isMobile ? 'flex-wrap' : ''}`}>
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "icon"}
            onClick={() => navigateDate('prev')}
            className={isMobile ? 'h-8 w-8 p-0' : ''}
          >
            <ChevronLeft className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size={isMobile ? "sm" : "default"}
                className={cn(
                  "justify-start text-left font-normal",
                  isMobile ? "min-w-0 flex-1 text-xs px-2" : "min-w-[200px]",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className={cn(isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4')} />
                <span className={isMobile ? 'truncate' : ''}>
                  {selectedDate ? format(selectedDate, isMobile ? "MMM d" : "PPP") : "Pick a date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "icon"}
            onClick={() => navigateDate('next')}
            disabled={isToday(selectedDate)}
            className={isMobile ? 'h-8 w-8 p-0' : ''}
          >
            <ChevronRight className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
          </Button>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "sm"}
            onClick={() => {
              setSelectedDate(new Date());
              setActivePeriod('today');
            }}
            className={isMobile ? 'ml-0 text-xs px-2 h-8' : 'ml-2'}
          >
            {t('common.time.today', 'Today')}
          </Button>
        </div>

        {/* Time Period Selector */}
        <div className={`flex justify-center gap-1.5 ${isMobile ? 'px-2' : ''}`}>
          <Button 
            variant={activePeriod === 'today' ? "secondary" : "outline"} 
            size="sm"
            onClick={() => setActivePeriod('today')}
            className={isMobile ? "text-xs px-3 py-1" : "text-xs px-3 py-1"}
          >
            {t('common.time.today', 'Today')}
          </Button>
          <Button 
            variant={activePeriod === 'week' ? "secondary" : "outline"} 
            size="sm"
            onClick={() => setActivePeriod('week')}
            className={isMobile ? "text-xs px-3 py-1" : "text-xs px-3 py-1"}
          >
            {t('analytics.week', 'Week')}
          </Button>
          <Button 
            variant={activePeriod === 'month' ? "secondary" : "outline"} 
            size="sm"
            onClick={() => setActivePeriod('month')}
            className={isMobile ? "text-xs px-3 py-1" : "text-xs px-3 py-1"}
          >
            {t('analytics.month', 'Month')}
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={`flex items-center justify-center ${isMobile ? 'p-4' : 'p-8'}`}>
            <Loader2 className={isMobile ? 'h-4 w-4' : 'h-6 w-6'} />
            <span className={`${isMobile ? 'text-xs ml-1' : 'text-sm ml-2'} text-muted-foreground`}>
              {t('clients.loadingCheckIn', 'Loading check-in data...')}
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`text-center ${isMobile ? 'py-4' : 'py-8'} text-red-500`}>
            <p className={isMobile ? 'text-xs break-words' : 'text-sm'}>{t('clients.errorLoadingCheckIn', 'Error loading check-in data')}: {error}</p>
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && activePeriod === 'today' && !checkInData?.checkIn && (
          <div className={`text-center ${isMobile ? 'py-4' : 'py-8'} text-muted-foreground`}>
            <CalendarIcon className={isMobile ? 'h-8 w-8 mx-auto' : 'h-12 w-12 mx-auto'} />
            <p className={isMobile ? 'text-xs' : 'text-sm'}>{t('clients.noCheckInForDate', 'No check-in found for this date')}</p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} mt-1 break-words`}>
              {formatDate(selectedDate)}
            </p>
          </div>
        )}

        {/* No Data State for Week/Month */}
        {!loading && !error && (activePeriod === 'week' || activePeriod === 'month') && 
         (!checkInData?.goalDistribution || checkInData.goalDistribution.length === 0 || 
          checkInData.goalDistribution.every(g => g.value === 0)) && (
          <div className={`text-center ${isMobile ? 'py-4' : 'py-8'} text-muted-foreground`}>
            <CalendarIcon className={isMobile ? 'h-8 w-8 mx-auto' : 'h-12 w-12 mx-auto'} />
            <p className={isMobile ? 'text-xs' : 'text-sm'}>
              {t('clients.noCheckInForPeriod', `No check-in data found for this ${activePeriod}`)}
            </p>
          </div>
        )}

        {/* Check-in Data */}
        {!loading && !error && ((activePeriod === 'today' && checkInData?.checkIn) || 
         (activePeriod !== 'today' && checkInData?.goalDistribution && checkInData.goalDistribution.length > 0 && 
          checkInData.goalDistribution.some(g => g.value > 0))) && (
          <div className={isMobile ? 'space-y-3' : 'space-y-6'}>
            {/* Goal Metrics - Polar Chart */}
            {checkInData.goalDistribution && checkInData.goalDistribution.length > 0 && (
              <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                <h3 className={isMobile ? 'text-sm font-semibold' : 'text-lg font-semibold'}>
                  {t('clients.goalMetrics', 'Goal Metrics')}
                </h3>
                <div className={isMobile ? 'h-64 w-full' : 'h-80 w-full'}>
                  {polarData && (
                    <PolarAreaChart data={polarData} options={polarOptions} />
                  )}
                </div>
                {/* Goal Legend */}
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-2'}`}>
                  {checkInData.goalDistribution.map((item) => (
                    <div key={item.id} className={`flex items-center gap-2 ${isMobile ? 'p-1.5' : 'p-2'} rounded bg-muted/30 min-w-0`}>
                      <div
                        className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'} rounded-full flex-shrink-0`}
                        style={{ backgroundColor: item.color }}
                      />
                      <span className={isMobile ? 'text-xs' : 'text-sm'}>{item.icon}</span>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium break-words flex-1 min-w-0`}>{item.name}</span>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground flex-shrink-0 ml-auto`}>
                        {activePeriod === 'today' ? `${item.value}/5` : `${item.value.toFixed(1)}/5`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bad Habits */}
            {checkInData.badHabits && checkInData.badHabits.length > 0 && (
              <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                <h3 className={isMobile ? 'text-sm font-semibold' : 'text-lg font-semibold'}>
                  {t('clients.badHabits', 'Habits to Reduce')}
                </h3>
                <div className={`grid grid-cols-1 ${isMobile ? 'gap-2' : 'gap-3'}`}>
                  {checkInData.badHabits.map((habit) => (
                    <div key={habit.id} className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} ${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-muted/30 gap-2`}>
                      <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''} min-w-0`}>
                        <span className={isMobile ? 'text-sm' : 'text-lg'}>{habit.icon}</span>
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium break-words flex-1 min-w-0`}>{habit.name}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}>
                        <div className={`${isMobile ? 'flex-1' : 'w-24'} h-2 bg-gray-200 rounded-full overflow-hidden`}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(habit.value / 5) * 100}%`,
                              backgroundColor: habit.color
                            }}
                          />
                        </div>
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ${isMobile ? 'min-w-[25px]' : 'min-w-[30px]'} text-right flex-shrink-0`}>
                          {activePeriod === 'today' ? `${habit.value}/5` : `${habit.value.toFixed(1)}/5`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Notes - Only show for today period */}
            {activePeriod === 'today' && (
              <div className={isMobile ? 'space-y-2' : 'space-y-4'}>
                <h3 className={isMobile ? 'text-sm font-semibold' : 'text-lg font-semibold'}>
                  {t('clients.dailyNotes', 'Daily Notes')}
                </h3>
                {checkInData.notes ? (
                  <div className={`${isMobile ? 'p-2' : 'p-4'} rounded-lg bg-muted/30 border`}>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground whitespace-pre-wrap break-words`}>
                      {checkInData.notes}
                    </p>
                  </div>
                ) : (
                  <div className={`${isMobile ? 'p-2' : 'p-4'} rounded-lg bg-muted/30 border text-center text-muted-foreground`}>
                    <p className={isMobile ? 'text-xs' : 'text-sm'}>
                      {t('clients.noNotesForDate', 'No notes saved for this date')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CoachClientCheckInView;

