  "use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/context/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { PageHeader } from "@/app/components/PageHeader";
import { useSessions } from "@/app/hooks/useSessions";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { ScheduleSessionDialog } from "@/app/components/ScheduleSessionDialog";
import { EditSessionDialog } from "@/app/components/EditSessionDialog";
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  MessageCircle,
  Edit,
  Video,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";



export default function Sessions() {
  const router = useRouter();
  const t = useTranslation();
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [isSessionDetailOpen, setIsSessionDetailOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [calendarView, setCalendarView] = useState('month');
  const [currentMonth, setCurrentMonth] = useState(() => new Date(2024, 0, 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date(2024, 0, 1));
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');

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

  // Set current dates after hydration to avoid hydration mismatch
  useEffect(() => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  }, []);

  // Use real data from database
  const { 
    sessions, 
    loading, 
    error, 
    refetchSessions,
    createSession,
    updateSession,
    deleteSession
  } = useSessions();

  // Helper: convert stored UTC date/time to viewer's local date/time (YYYY-MM-DD, HH:MM)
  const toLocalFromUTC = (dateStrUTC, timeHHMMUTC) => {
    try {
      const viewerTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const iso = `${String(dateStrUTC).slice(0,10)}T${(timeHHMMUTC||'').substring(0,5)}:00Z`;
      const d = new Date(iso);
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: viewerTZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
      return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
    } catch {
      return { date: String(dateStrUTC).slice(0,10), time: (timeHHMMUTC||'').substring(0,5) };
    }
  };

  // Helper: get local date string in YYYY-MM-DD format (consistent with toLocalFromUTC)
  const getLocalDateString = (date) => {
    try {
      const viewerTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      return date.toLocaleDateString('en-CA', { timeZone: viewerTZ });
    } catch {
      return date.toISOString().split('T')[0];
    }
  };

  // Generate calendar data from real sessions
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 0-based
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the Monday of the week containing the first day
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
    startDate.setDate(firstDay.getDate() + mondayOffset);
    
    // Generate 42 days (6 weeks)
    const calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const day = currentDate.getDate();
      const isCurrentMonth = currentDate.getMonth() === month;
      const dateStr = getLocalDateString(currentDate); // YYYY-MM-DD in local timezone
      
      // Check if there are sessions on this date
      const daySessions = sessions.filter(session => {
        const local = toLocalFromUTC(session.sessionDate, session.sessionTime);
        return local.date === dateStr;
      });
      
      calendarDays.push({
        day: isCurrentMonth ? day : '',
        isEmpty: !isCurrentMonth,
        hasSession: daySessions.length > 0,
        date: dateStr,
        sessions: daySessions
      });
    }
    
    return calendarDays;
  };

  const generateWeekDays = () => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(today.getDate() + mondayOffset);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(currentWeekStart);
      currentDate.setDate(currentWeekStart.getDate() + i);
      
      const day = currentDate.getDate();
      const dateStr = getLocalDateString(currentDate); // YYYY-MM-DD in local timezone
      const formattedDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Check if there are sessions on this date
      const daySessions = sessions.filter(session => {
        const local = toLocalFromUTC(session.sessionDate, session.sessionTime);
        return local.date === dateStr;
      });
      
      weekDays.push({
        day,
        date: dateStr, // Use ISO date for consistency with month view
        isEmpty: false,
        hasSession: daySessions.length > 0,
        dateStr, // Keep for any existing callers of dateStr
        sessions: daySessions
      });
    }
    
    return weekDays;
  };

  const generateDayHours = () => {
    const selectedDateObj = new Date(selectedDate);
    const dateStr = getLocalDateString(selectedDateObj); // YYYY-MM-DD in local timezone
    
    // Get sessions for the selected date
    const daySessions = sessions.filter(session => {
      const local = toLocalFromUTC(session.sessionDate, session.sessionTime);
      return local.date === dateStr;
    });
    
    // Generate hourly slots from 8 AM to 8 PM
    const hours = [];
    for (let hour = 8; hour <= 20; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      
      // Find session at this hour
      const sessionAtHour = daySessions.find(session => {
        const local = toLocalFromUTC(session.sessionDate, session.sessionTime);
        return local.time === timeStr;
      });
      
      hours.push({
        hour: timeStr,
        isEmpty: false,
        hasSession: !!sessionAtHour,
          session: sessionAtHour ? {
          client: sessionAtHour.client,
          group: sessionAtHour.group,
          type: sessionAtHour.type,
          title: sessionAtHour.title,
          duration: sessionAtHour.duration,
          sessionTime: toLocalFromUTC(sessionAtHour.sessionDate, sessionAtHour.sessionTime).time
        } : null
      });
    }
    
    return hours;
  };

  // Helper to compute end time string (HH:MM) given start "HH:MM" and duration minutes
  const getEndTime = (startHHMM, durationMinutes) => {
    try {
      const [h, m] = startHHMM.split(':').map(Number);
      const start = new Date(0, 0, 0, h, m || 0, 0, 0);
      const end = new Date(start.getTime() + (Number(durationMinutes || 0) * 60000));
      const eh = end.getHours().toString().padStart(2, '0');
      const em = end.getMinutes().toString().padStart(2, '0');
      return `${eh}:${em}`;
    } catch {
      return '';
    }
  };

  // Calendar navigation handlers
  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const handlePreviousDay = () => {
    const newDay = new Date(selectedDate);
    newDay.setDate(newDay.getDate() - 1);
    setSelectedDate(newDay);
  };

  const handleNextDay = () => {
    const newDay = new Date(selectedDate);
    newDay.setDate(newDay.getDate() + 1);
    setSelectedDate(newDay);
  };

  // Format date for display
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Generate session details for calendar clicks
  const getSessionDetailsForDate = (dateStr) => {
    const daySessions = sessions.filter(session => {
      const local = toLocalFromUTC(session.sessionDate, session.sessionTime);
      return local.date === dateStr;
    });
    
    return daySessions.map(session => ({
      time: toLocalFromUTC(session.sessionDate, session.sessionTime).time,
      client: session.client,
      group: session.group,
      type: session.type,
      mood: session.mood,
      moodEmoji: session.moodEmoji,
      title: session.title,
      duration: session.duration,
      id: session.id,
      clientId: session.clientId,
      groupId: session.groupId,
      meetingLink: session.meetingLink
    }));
  };

  const handleDayClick = (day) => {
    // Update selected date for day view
    if (day.date) {
      setSelectedDate(new Date(day.date));
    } else if (day.dateStr) {
      setSelectedDate(new Date(day.dateStr));
    }
    
    if (day.hasSession && day.sessions && day.sessions.length > 0) {
      const dateKey = day.date || day.dateStr;
      const sessionDetails = getSessionDetailsForDate(dateKey);
      setSelectedSessionDetail({
        ...sessionDetails[0],
        date: dateKey,
        day: day.day,
        allSessions: sessionDetails
      });
      setIsSessionDetailOpen(true);
    }
  };

  const handleJoinSession = (session) => {
    if (session.meetingLink) {
      window.open(session.meetingLink, '_blank');
    } else {
      // Fallback to dialog if no meeting link
      setSelectedSession(session);
      setSelectedSessionDetail({
        ...session,
        date: session.date
      });
      setIsSessionDetailOpen(true);
    }
  };

  const handleViewSession = (session) => {
    setSelectedSession(session);
    setSelectedSessionDetail({
      ...session,
      date: session.date
    });
    setIsSessionDetailOpen(true);
  };

  const handleEditSession = (session) => {
    setSelectedSession(session);
    setIsEditDialogOpen(true);
  };

  const handleMessageSession = (session) => {
    if (session.groupId) {
      // Navigate to group chat using the actual group ID
      router.push(`/coach/group/${session.groupId}`);
    } else if (session.clientId) {
      // Navigate to client chat using the actual client ID
      router.push(`/coach/clients/${session.clientId}`);
    } else {
      console.error('No groupId or clientId found in session:', session);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    let aValue;
    let bValue;
    
    switch (sortBy) {
      case 'date':
        aValue = a.date;
        bValue = b.date;
        break;
      case 'client':
        aValue = a.client || a.group || '';
        bValue = b.client || b.group || '';
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      default:
        aValue = a.date;
        bValue = b.date;
    }
    
    const comparison = aValue.localeCompare(bValue);
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  const renderCalendarView = () => {
    const calendarDays = generateCalendarDays();
    const weekDays = generateWeekDays();
    const dayHours = generateDayHours();
    
    switch (calendarView) {
      case 'month':
        return (
          <div className={`bg-muted/30 rounded-lg ${isMobile ? 'p-2' : 'p-4'}`}>
            <div className={`grid grid-cols-7 ${isMobile ? 'gap-1' : 'gap-2'} text-center ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground ${isMobile ? 'mb-2' : 'mb-4'}`}>
              <div>{isMobile ? 'M' : 'Mon'}</div>
              <div>{isMobile ? 'T' : 'Tue'}</div>
              <div>{isMobile ? 'W' : 'Wed'}</div>
              <div>{isMobile ? 'T' : 'Thu'}</div>
              <div>{isMobile ? 'F' : 'Fri'}</div>
              <div>{isMobile ? 'S' : 'Sat'}</div>
              <div>{isMobile ? 'S' : 'Sun'}</div>
            </div>
            <div className={`grid grid-cols-7 ${isMobile ? 'gap-1' : 'gap-2'}`}>
              {calendarDays.map((dayObj, index) => (
                <button
                  key={index}
                  className={`
                    ${isMobile ? 'h-12' : 'h-20'} w-full ${isMobile ? 'text-xs' : 'text-sm'} rounded-lg transition-all relative ${isMobile ? 'p-1' : 'p-2'} flex flex-col
                    ${dayObj.isEmpty 
                      ? 'invisible' 
                      : dayObj.hasSession
                        ? 'bg-primary/20 text-primary font-medium hover:bg-primary/30 cursor-pointer border-2 border-primary/50' 
                        : 'text-foreground hover:bg-muted/50 border border-transparent hover:border-border'
                    }
                  `}
                  onClick={() => handleDayClick(dayObj)}
                  disabled={dayObj.isEmpty}
                >
                  {!dayObj.isEmpty && (
                    <>
                      <div className={`text-left font-semibold ${isMobile ? 'text-xs mb-0.5' : 'text-base mb-1'}`}>
                        {dayObj.day}
                      </div>
                      {dayObj.hasSession && (
                        <div className="flex-1 flex items-center justify-center">
                          <div className={`bg-primary text-primary-foreground rounded-full ${isMobile ? 'w-4 h-4 text-[10px]' : 'w-6 h-6 text-xs'} flex items-center justify-center font-bold`}>
                            {dayObj.sessions?.length || 0}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'week':
        return (
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map((dayObj, index) => (
                <div key={index} className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                  </div>
                  <div className="text-sm font-medium">{dayObj.date}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((dayObj, index) => (
                <button
                  key={index}
                  className={`
                    h-48 md:h-56 w-full text-sm rounded-lg transition-all relative p-2 flex flex-col
                    ${dayObj.hasSession
                      ? 'bg-primary/20 text-primary font-medium hover:bg-primary/30 cursor-pointer border-2 border-primary/50' 
                      : 'text-foreground hover:bg-muted/50 border border-transparent hover:border-border'
                    }
                  `}
                  onClick={() => handleDayClick(dayObj)}
                >
                  {dayObj.hasSession && (
                    <div className="space-y-1 overflow-y-auto max-h-40 pr-1">
                      {dayObj.sessions?.map((session, idx) => {
                        const start = toLocalFromUTC(session.sessionDate, session.sessionTime).time;
                        const end = getEndTime(start, session.duration);
                        return (
                          <div key={idx} className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center justify-between">
                            <span>{start}{end ? `–${end}` : ''}</span>
                            {session.title && <span className="ml-2 truncate max-w-[120px]">{session.title}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'day':
        return (
          <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">{formatDate(selectedDate)}</h3>
                </div>
            <div className="space-y-2">
              {dayHours.map((hour, index) => (
                <div
                  key={index}
                  className={`
                    flex items-center p-3 rounded-lg border transition-all
                    ${hour.hasSession
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-background hover:bg-muted/50 border-transparent hover:border-border'
                    }
                  `}
                >
                  <div className="w-16 text-sm font-medium text-muted-foreground">
                    {hour.hour}
                  </div>
                  {hour.hasSession && hour.session && (
                    <div className="flex-1 flex items-center gap-2 ml-4">
                      <div className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm">
                        {(hour.session.sessionTime || hour.hour)}{hour.session.duration ? `–${getEndTime(hour.session.sessionTime || hour.hour, hour.session.duration)}` : ''}
                      </div>
                      <div className="bg-accent text-accent-foreground px-3 py-1 rounded text-sm">
                        {hour.session.client || hour.session.group || hour.session.title}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {hour.session.type}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`page-container ${isMobile ? 'px-4 pb-24' : ''}`}>
      {/* Page Header */}
      <PageHeader 
        title={t('navigation.sessions')} 
        subtitle={"Manage your sessions"}
      >
        <Button 
          className={`bg-gradient-primary text-[#1A2D4D] shadow-medium hover:shadow-strong transition-all ${isMobile ? 'text-xs px-2 h-8' : ''}`}
          onClick={() => setIsScheduleDialogOpen(true)}
          size={isMobile ? "sm" : "default"}
        >
          <Plus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? 'mr-1' : 'mr-2'}`} />
          {isMobile ? 'Schedule' : 'Schedule Session'}
        </Button>
      </PageHeader>

      {/* Main Sessions Card */}
      <Card className={`card-standard ${isMobile ? 'p-3' : ''}`}>
        <CardHeader className={isMobile ? 'pb-3 px-0' : ''}>
          <div className={`flex items-center justify-between`}>
                <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                  <Calendar className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-primary`} />
                  Sessions
                </CardTitle>
            <div className={`flex items-center ${isMobile ? 'w-full justify-center flex-wrap gap-2' : 'gap-2'}`}>
              <div className={`flex items-center bg-muted rounded-lg ${isMobile ? 'p-0.5' : 'p-1'}`}>
                <Button
                  size={isMobile ? "sm" : "sm"}
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-8 px-3'}`}
                >
                  <List className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-1'}`} />
                  {!isMobile && "List"}
                </Button>
                <Button
                  size={isMobile ? "sm" : "sm"}
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('calendar')}
                  className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-8 px-3'}`}
                >
                  <CalendarDays className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-1'}`} />
                  {!isMobile && "Calendar"}
                </Button>
              </div>
              {viewMode === 'calendar' && (
                <div className={`flex items-center bg-muted rounded-lg ${isMobile ? 'p-0.5' : 'p-1'}`}>
                  <Button
                    size={isMobile ? "sm" : "sm"}
                    variant={calendarView === 'month' ? 'default' : 'ghost'}
                    onClick={() => setCalendarView('month')}
                    className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-8 px-3'}`}
                  >
                    Month
                  </Button>
                  <Button
                    size={isMobile ? "sm" : "sm"}
                    variant={calendarView === 'week' ? 'default' : 'ghost'}
                    onClick={() => setCalendarView('week')}
                    className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-8 px-3'}`}
                  >
                    Week
                  </Button>
                  <Button
                    size={isMobile ? "sm" : "sm"}
                    variant={calendarView === 'day' ? 'default' : 'ghost'}
                    onClick={() => setCalendarView('day')}
                    className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-8 px-3'}`}
                  >
                    Day
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className={isMobile ? 'px-0' : ''}>
          <div className={`space-y-6 ${isMobile ? 'space-y-3' : ''}`}>
            {viewMode === 'list' ? (
              <div className={`space-y-4 ${isMobile ? 'space-y-2' : ''}`}>
                {/* Sort Controls */}
                <div className={`flex items-center ${isMobile ? 'flex-wrap gap-1 p-2' : 'gap-2 p-3'} bg-muted/30 rounded-lg`}>
                  <span className={`${isMobile ? 'text-xs w-full mb-1' : 'text-sm'} font-medium text-muted-foreground`}>Sort By:</span>
                  <Button
                    size={isMobile ? "sm" : "sm"}
                    variant={sortBy === 'date' ? 'default' : 'ghost'}
                    onClick={() => handleSort('date')}
                    className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-8 px-3'}`}
                  >
                    Date
                    {sortBy === 'date' && (
                      sortOrder === 'asc' ? <ArrowUp className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} ${isMobile ? 'ml-0.5' : 'ml-1'}`} /> : <ArrowDown className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} ${isMobile ? 'ml-0.5' : 'ml-1'}`} />
                    )}
                  </Button>
                  <Button
                    size={isMobile ? "sm" : "sm"}
                    variant={sortBy === 'client' ? 'default' : 'ghost'}
                    onClick={() => handleSort('client')}
                    className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-8 px-3'}`}
                  >
                    {isMobile ? 'Client' : 'Client/Group'}
                    {sortBy === 'client' && (
                      sortOrder === 'asc' ? <ArrowUp className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} ${isMobile ? 'ml-0.5' : 'ml-1'}`} /> : <ArrowDown className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} ${isMobile ? 'ml-0.5' : 'ml-1'}`} />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={sortBy === 'type' ? 'default' : 'ghost'}
                    onClick={() => handleSort('type')}
                    className="h-8 px-3"
                  >
                      Type
                    {sortBy === 'type' && (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </div>
                
                {/* Sessions List */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-muted-foreground">Loading sessions...</div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-destructive">Error loading sessions: {error}</div>
                    </div>
                  ) : sortedSessions.length === 0 ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-muted-foreground">No sessions found</div>
                    </div>
                  ) : (
                    sortedSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'} p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all border border-transparent hover:border-border hover:shadow-sm`}
                  >
                    <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2' : 'gap-4'}`}>
                    <div className={`text-center ${isMobile ? 'min-w-[80px]' : 'min-w-[120px]'}`}>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
                        {toLocalFromUTC(session.sessionDate, session.sessionTime).date}
                      </p>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
                        {(() => { const t = toLocalFromUTC(session.sessionDate, session.sessionTime).time; return `${t}${session.duration ? `–${getEndTime(t, session.duration)}` : ''}`; })()}
                      </p>
                    </div>
                      
                      <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2' : 'gap-3'}`}>
                        {session.group ? (
                          <div className="flex items-center gap-2">
                            <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary`} />
                            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>{session.group}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Avatar className={isMobile ? 'h-6 w-6' : 'h-8 w-8'}>
                              {session.clientAvatar ? (
                                <AvatarImage 
                                  src={session.clientAvatar} 
                                  alt={session.client || 'Client'} 
                                  className="object-cover"
                                  onError={(e) => {
                                    console.error('Avatar image failed to load:', session.clientAvatar);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <AvatarFallback className={`bg-primary text-primary-foreground ${isMobile ? 'text-[10px]' : 'text-xs'} flex items-center justify-center`}>
                                {session.client && session.client.trim() 
                                  ? session.client.split(' ').map((n) => n && n[0] ? n[0] : '').filter(Boolean).join('').toUpperCase().slice(0, 2) || 'U'
                                  : 'U'
                                }
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground block`}>{session.client || 'Unknown Client'}</span>
                              {!isMobile && <span className="text-xs text-muted-foreground">Individual Session</span>}
                            </div>
                          </div>
                        )}
                        
                        <Badge 
                          variant="outline" 
                          className={`${session.type === 'Group' 
                            ? 'border-primary text-primary bg-primary/10' 
                            : 'border-accent text-accent bg-accent/10'
                          } ${isMobile ? 'text-[10px] px-1.5 py-0.5' : ''}`}
                        >
                          {session.type}
                        </Badge>
                        
                        <div className="flex items-center gap-1">
                          <span className={isMobile ? 'text-sm' : 'text-lg'}>{session.moodEmoji}</span>
                          <Badge variant="secondary" className={isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-xs'}>
                            {session?.duration ? `${session.duration} min` : (session.type === 'Group' ? '45 min' : '60 min')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className={`flex gap-2 ${isMobile ? 'w-full justify-end' : ''}`}>
                      <Button 
                        size={isMobile ? "sm" : "sm"}
                        className={`bg-gradient-primary text-[#1A2D4D] hover:shadow-md transition-all ${isMobile ? 'text-xs px-2 h-7' : ''}`}
                        onClick={() => handleJoinSession(session)}
                      >
                        <Video className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? 'mr-1' : 'mr-2'}`} />
                          {isMobile ? 'Join' : 'Join'}
                      </Button>
                      <Button 
                        size={isMobile ? "sm" : "sm"} 
                        variant="outline" 
                        className={`hover:bg-accent hover:text-accent-foreground ${isMobile ? 'h-7 w-7 p-0' : ''}`}
                        onClick={() => handleEditSession(session)}
                      >
                        <Edit className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                      </Button>
                      <Button 
                        size={isMobile ? "sm" : "sm"} 
                        variant="outline" 
                        className={`hover:bg-secondary hover:text-secondary-foreground ${isMobile ? 'h-7 w-7 p-0' : ''}`}
                        onClick={() => handleMessageSession(session)}
                      >
                        <MessageCircle className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                      </Button>
                    </div>
                  </div>
                  ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                 {/* Calendar Navigation */}
                 <div className="flex items-center justify-center">
                   <div className="flex items-center gap-2">
                     <Button 
                       size="sm" 
                       variant="outline" 
                       onClick={calendarView === 'day' ? handlePreviousDay : handlePreviousMonth}
                     >
                       <ChevronLeft className="h-4 w-4" />
                     </Button>
                     <h3 className="text-lg font-semibold text-foreground min-w-[120px] text-center">
                       {calendarView === 'day' ? formatDate(selectedDate) : formatMonthYear(currentMonth)}
                     </h3>
                     <Button 
                       size="sm" 
                       variant="outline" 
                       onClick={calendarView === 'day' ? handleNextDay : handleNextMonth}
                     >
                       <ChevronRight className="h-4 w-4" />
                     </Button>
                   </div>
                 </div>

                {/* Calendar Grid */}
                {renderCalendarView()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Session Dialog */}
      <ScheduleSessionDialog
        open={isScheduleDialogOpen}
        onOpenChange={setIsScheduleDialogOpen}
        onSessionCreated={refetchSessions}
        groupName="General Group"
        groupMembers={8}
      />

      {/* Session Detail Dialog */}
      <Dialog open={isSessionDetailOpen} onOpenChange={setIsSessionDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Session Details - {selectedSessionDetail?.date}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSessionDetail && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {selectedSessionDetail.time}
                      {selectedSessionDetail.duration ? `–${getEndTime(selectedSessionDetail.time, selectedSessionDetail.duration)}` : ''}
                    </span>
                  </div>
                  
                  <span className="text-sm">{selectedSessionDetail.title}</span>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary text-primary">
                      {selectedSessionDetail.type}
                    </Badge>
                    <span className="text-lg">{selectedSessionDetail.moodEmoji}</span>
                  </div>
                </div>
              </div>

              {/* Show all sessions for this day if multiple */}
              {selectedSessionDetail.allSessions && selectedSessionDetail.allSessions.length > 1 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">All Sessions Today:</h4>
                  {selectedSessionDetail.allSessions.map((session, index) => {
                    const end = session.duration ? getEndTime(session.time, session.duration) : '';
                    return (
                      <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/20 border">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{session.time}{end ? `–${end}` : ''}</span>
                          <span className="text-sm">{session.group || session.client || session.title}</span>
                          <Badge variant="outline" className="text-xs">{session.type}</Badge>
                        </div>
                        <span className="text-sm">{session.moodEmoji}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    if (selectedSessionDetail?.meetingLink) {
                      window.open(selectedSessionDetail.meetingLink, '_blank');
                    }
                  }}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Session
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <EditSessionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        session={selectedSession}
        onSessionUpdated={refetchSessions}
      />
    </div>
  );
}