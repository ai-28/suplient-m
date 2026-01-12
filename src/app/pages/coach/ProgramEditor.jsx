"use client"

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, CheckSquare, MessageSquare, Upload, AlertTriangle } from "lucide-react";
import { AddElementDialog } from "@/app/components/AddElementDialog";
import { EditElementDialog } from "@/app/components/EditElementDialog";
import { ProgramFlowChart } from "@/app/components/ProgramFlowChart";
import { ProgramMessagePreview } from "@/app/components/ProgramMessagePreview";
import { useTranslation } from "@/app/context/LanguageContext";
import { toast } from "sonner";
import { cn } from "@/app/lib/utils";
import { MobileDeviceEmulator } from "react-mobile-emulator";

// Responsive wrapper component that calculates scale based on container width
function ResponsiveMobileEmulator({ children }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.8);
  const deviceWidth = 393; // iPhone 14 Pro width (including bezels)

  useEffect(() => {
    if (!containerRef.current) return;

    const calculateScale = () => {
      if (containerRef.current) {
        // Get the actual available width (accounting for padding)
        const containerWidth = containerRef.current.offsetWidth;
        const padding = 16; // p-2 = 0.5rem = 8px on each side = 16px total
        const availableWidth = containerWidth - padding;
        
        // Calculate scale to fit the device width
        const calculatedScale = availableWidth / deviceWidth;
        
        // Clamp scale between 0.4 and 1.2
        const clampedScale = Math.max(0.4, Math.min(1.2, calculatedScale));
        
        setScale(clampedScale);
      }
    };

    // Initial calculation
    const timeoutId = setTimeout(calculateScale, 100);
    
    // Use ResizeObserver for better accuracy
    const resizeObserver = new ResizeObserver(() => {
      calculateScale();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', calculateScale);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateScale);
    };
  }, []);

  return (
    <div className="flex items-center justify-center p-2 w-full">
      <div 
        ref={containerRef}
        className="w-full max-w-full mobile-emulator-wrapper"
        style={{ minWidth: 0 }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
          <MobileDeviceEmulator 
            device="iphone15" 
            orientation="portrait" 
            scale={1}
          >
            {children}
          </MobileDeviceEmulator>
        </div>
      </div>
    </div>
  );
}

export default function ProgramEditor() {
  const { id } = useParams();
  const router = useRouter();
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
  
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isProgram, setIsProgram] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: 4, // weeks
  });

  const [elements, setElements] = useState([]);
  const [addElementDialog, setAddElementDialog] = useState({
    open: false,
    type: null,
    preselectedDay: null,
    preselectedWeek: null
  });
  const [editElementDialog, setEditElementDialog] = useState({
      open: false,
    element: null
  });
  const [highlightedElementId, setHighlightedElementId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [previewElements, setPreviewElements] = useState([]);

  // Fetch program data
  const fetchProgram = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch as program first, then fallback to template
      let response = await fetch(`/api/programs/${id}`);
      let isProgram = response.ok;
      
      if (!response.ok) {
        // Fallback to template if not found as program
        response = await fetch(`/api/temp_programs/${id}`);
        isProgram = false;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch program');
      }
      
      const data = await response.json();
      setProgram(data.program);
      setIsProgram(isProgram);
      
      setFormData({
        name: data.program.name || "",
        description: data.program.description || "",
        duration: data.program.duration || 4
      });
      
      // Transform elements to ProgramFlowChart expected format
      const transformedElements = (data.program.elements || []).map(element => {
        // Parse elementData if it's a string from database
        let elementData = element.elementData || element.data || {};
        
        // If elementData is a string, parse it
        if (typeof elementData === 'string') {
          try {
            elementData = JSON.parse(elementData);
          } catch (e) {
            console.error('Error parsing elementData for element:', element.id, e);
            elementData = {};
          }
        }
        
        // Ensure elementData is an object, not null or array
        if (!elementData || typeof elementData !== 'object' || Array.isArray(elementData)) {
          elementData = {};
        }
        
        return {
          ...element,
          // Calculate absolute day from week and day-of-week (day is 1-7, week is 1+)
          scheduledDay: element.week && element.day ? (element.week - 1) * 7 + element.day : (element.scheduledDay || 1),
          scheduledTime: element.scheduledTime || '09:00',
          type: element.type || 'content',
          // Map elementData from database to data for component (now properly parsed)
          data: elementData
        };
      });
      console.log("transformedElements", transformedElements);
      
      setElements(transformedElements);
    } catch (err) {
      console.error('Error fetching program:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (id) {
      fetchProgram();
    }
  }, [id]);

  // Refresh preview when elements change and a day is selected
  useEffect(() => {
    if (!selectedDay) {
      setPreviewElements([]);
      return;
    }

    if (!elements || !Array.isArray(elements)) {
      setPreviewElements([]);
      return;
    }

    // Calculate which elements belong to this day
    try {
      const dayElements = elements.filter(el => {
        if (!el) return false;
        
        // Handle both scheduledDay (absolute day) and week/day format
        if (el.scheduledDay !== undefined && el.scheduledDay !== null) {
          return el.scheduledDay === selectedDay;
        }
        
        if (el.week !== undefined && el.week !== null && 
            el.day !== undefined && el.day !== null) {
          const elementDay = ((el.week - 1) * 7) + el.day;
          return elementDay === selectedDay;
        }
        
        return false;
      });
      
      setPreviewElements(dayElements);
    } catch (error) {
      console.error('Error calculating day elements:', error);
      setPreviewElements([]);
    }
  }, [elements, selectedDay]);

  if (loading) {
    return (
      <div className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'py-8'}`}>
        <div className={`flex items-center justify-center ${isMobile ? 'py-8' : 'py-12'}`}>
          <div className="text-center">
            <div className={`animate-spin rounded-full ${isMobile ? 'h-6 w-6' : 'h-8 w-8'} border-b-2 border-primary mx-auto mb-4`}></div>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>{t('programs.loadingProgram', 'Loading program...')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'py-8'}`}>
        <div className={`flex items-center justify-center ${isMobile ? 'py-8' : 'py-12'}`}>
          <div className="text-center">
            <AlertTriangle className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} text-red-500 mx-auto mb-4`} />
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-2`}>{t('programs.errorLoadingProgram', 'Error Loading Program')}</h3>
            <p className={`text-muted-foreground mb-4 ${isMobile ? 'text-sm' : ''}`}>{error}</p>
            <Button onClick={fetchProgram} variant="outline" size={isMobile ? "sm" : "default"}>
              {t('common.buttons.tryAgain', 'Try Again')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'py-8'}`}>
        <div className="text-center">
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground mb-4`}>{t('programs.programNotFound', 'Program Not Found')}</h1>
          <Button onClick={() => router.push('/coach/programs')} size={isMobile ? "sm" : "default"}>
            {t('programs.backToPrograms', 'Back to Programs')}
          </Button>
        </div>
      </div>
    );
  }

  const handleAddElementToDay = (day, week, type) => {
    setAddElementDialog({ 
      open: true, 
      type, 
      preselectedDay: day, 
      preselectedWeek: week 
    });
  };

  const handleAddElement = (elementData) => {
    const newElement = {
      ...elementData,
      id: `element-${Date.now()}`
    };
    setElements(prev => [...prev, newElement]);
    
    // Highlight the newly added element
    setHighlightedElementId(newElement.id);
    setTimeout(() => setHighlightedElementId(null), 3000);
  };

  const handleEditElement = (element) => {
    setEditElementDialog({ open: true, element });
  };

  const handleUpdateElement = (updatedElement) => {
    setElements(prev => prev.map(el => el.id === updatedElement.id ? updatedElement : el));
    setEditElementDialog({ open: false, element: null });
  };

  const handleDeleteElement = (elementId) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
    setEditElementDialog({ open: false, element: null });
    toast.success('Element deleted. Click Save to apply changes.');
  };

  // Handle day click to show preview
  const handleDayClick = (day) => {
    setSelectedDay(day);
    // Preview elements will be calculated by useEffect
  };

  // Close preview
  const handleClosePreview = () => {
    setSelectedDay(null);
    setPreviewElements([]);
  };


  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(t('common.messages.fillRequiredFields', 'Please fill in the required fields'));
      return;
    }

    try {
      setSaving(true);
      
      // Use the correct API endpoint based on whether it's a program or template
      const apiEndpoint = isProgram ? `/api/programs/${id}` : `/api/temp_programs/${id}`;
      
      // Convert scheduledDay back to week and day for database storage
      const elementsForSave = elements.map(element => {
        // If element already has week and day, use them; otherwise calculate from scheduledDay
        const week = element.week || Math.ceil(element.scheduledDay / 7);
        const day = element.day || ((element.scheduledDay - 1) % 7) + 1;
        
        return {
          type: element.type,
          title: element.title,
          week: week,
          day: day,
          scheduledTime: element.scheduledTime || '09:00:00',
          data: element.data || {}
        };
      });

      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          duration: formData.duration,
          elements: elementsForSave
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update program');
      }

      toast.success(isProgram ? 'Program updated successfully!' : 'Program template updated successfully!');
      router.push('/coach/programs');
    } catch (error) {
      console.error('Failed to update program:', error);
      toast.error(error.message || 'Failed to update program');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`container mx-auto ${isMobile ? 'px-4 py-4 pb-24' : 'py-8'} space-y-8 ${isMobile ? 'space-y-4' : ''}`}>
      {/* Header */}
      <div className={`flex items-center ${isMobile ? 'flex-col gap-3' : 'justify-between'}`}>
        <div className={`flex items-center ${isMobile ? 'w-full justify-between' : 'gap-4'}`}>
          <Button variant="ghost" size={isMobile ? "sm" : "sm"} onClick={() => router.push('/coach/programs')} className={isMobile ? 'text-xs px-2 h-8' : ''}>
            <ArrowLeft className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            {!isMobile && t('common.buttons.back', 'Back')}
          </Button>
          <div className={isMobile ? 'flex-1 text-center' : ''}>
            <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-foreground`}>
              {isProgram ? t('programs.viewProgram', 'View Program') : t('programs.editProgramTemplate', 'Edit Program Template')}
            </h1>
            <p className={`text-muted-foreground ${isMobile ? 'text-xs' : ''}`}>{formData.name}</p>
            {isProgram && (
              <Badge variant="secondary" className={`mt-2 ${isMobile ? 'text-xs px-1.5 py-0' : ''}`}>
                {t('programs.activeProgramInstance', 'Active Program Instance')}
              </Badge>
            )}
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={saving} className={`flex items-center ${isMobile ? 'gap-1 w-full text-xs h-8' : 'gap-2'}`} size={isMobile ? "sm" : "default"}>
          {saving && (
            <div className={`animate-spin rounded-full ${isMobile ? 'h-3 w-3' : 'h-4 w-4'} border-b-2 border-white`}></div>
          )}
          {saving ? t('common.messages.loading') : (isProgram ? t('programs.updateProgram', 'Update Program') : t('programs.saveTemplate', 'Save Template'))}
        </Button>
      </div>

      {/* Program Setup - Horizontal Layout */}
      <Card className={`border-2 border-border/60 shadow-md bg-card/95 ${isMobile ? 'p-3' : ''}`}>
        <CardHeader className={isMobile ? 'pb-3 px-0' : ''}>
          <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'}`}>{t('programs.programSetup')}</CardTitle>
          <CardDescription className={isMobile ? 'text-xs' : ''}>{t('programs.basicInfo')}</CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'px-0' : ''}>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-3 gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">{t('programs.programName')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('programs.programNamePlaceholder', 'e.g. Anxiety Management Program')}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">{t('programs.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 300) {
                    setFormData(prev => ({ ...prev, description: value }));
                  }
                }}
                placeholder={t('programs.descriptionPlaceholder', 'What does this program help with?')}
                className="resize-none"
                rows={5}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {formData.description.length}/300 {t('common.labels.characters')}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium">{t('programs.duration')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="52"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                  className="h-10 w-20"
                />
                <span className="text-sm text-muted-foreground">{t('programs.weeks')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Program Flow Overview with Preview Panel */}
      <div className={cn(
        "relative",
        selectedDay && !isMobile ? "grid grid-cols-1 lg:grid-cols-3 gap-4" : ""
      )}>
        {/* Program Flow Chart - Takes 2/3 of width (2:1 ratio) */}
        <div className={selectedDay && !isMobile ? "lg:col-span-2" : "w-full"}>
          <ProgramFlowChart 
            elements={elements} 
            duration={formData.duration}
            highlightedElementId={highlightedElementId}
            forceCloseDropdowns={addElementDialog.open}
            onElementClick={handleEditElement}
            onAddElementToDay={handleAddElementToDay}
            onDayClick={handleDayClick}
            selectedDay={selectedDay}
          />
        </div>

        {/* Preview Panel - Desktop: Side panel, Mobile: Bottom sheet */}
        {selectedDay && (
          <>
            {/* Mobile backdrop */}
            {isMobile && (
              <div 
                className="fixed inset-0 bg-black/50 z-40"
                onClick={handleClosePreview}
              />
            )}
            <div className={cn(
              isMobile 
                ? "fixed inset-x-0 bottom-0 z-50 bg-background border-t shadow-lg rounded-t-lg max-h-[70vh] animate-in slide-in-from-bottom duration-300"
                : "lg:col-span-1 lg:sticky lg:top-4 animate-in fade-in slide-in-from-right duration-300"
            )}>
              {isMobile ? (
                // Mobile view: Simple preview without emulator frame
                <ProgramMessagePreview
                  elements={previewElements}
                  programDay={selectedDay}
                  onClose={handleClosePreview}
                  isMobile={isMobile}
                />
              ) : (
                // Desktop view: Show in mobile emulator frame
                <ResponsiveMobileEmulator>
                  <ProgramMessagePreview
                    elements={previewElements}
                    programDay={selectedDay}
                    onClose={handleClosePreview}
                    isMobile={false}
                  />
                </ResponsiveMobileEmulator>
              )}
            </div>
          </>
        )}
      </div>

      <AddElementDialog
        open={addElementDialog.open}
        onOpenChange={(open) => setAddElementDialog({ open, type: null })}
        elementType={addElementDialog.type}
        programDuration={formData.duration}
        preselectedDay={addElementDialog.preselectedDay}
        preselectedWeek={addElementDialog.preselectedWeek}
        onAddElement={handleAddElement}
      />

      <EditElementDialog
        element={editElementDialog.element}
        open={editElementDialog.open}
        onOpenChange={(open) => setEditElementDialog({ open, element: null })}
        onSave={handleUpdateElement}
        onDelete={handleDeleteElement}
      />
    </div>
  );
}