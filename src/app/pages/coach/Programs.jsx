"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from "@/app/context/LanguageContext";
import { Plus, Users, Target, Clock, Copy, Edit, CheckCircle, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { AIAssistProgramModal } from '@/app/components/AIAssistProgramModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { PageHeader } from '@/app/components/PageHeader';
import { StatsCard } from '@/app/components/StatsCard';
import EnrolledMembersDialog from '@/app/components/EnrolledMembersDialog';
import { toast } from 'sonner';

export default function Programs() {
  const router = useRouter();
  const t = useTranslation();
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [enrolledMembersDialogOpen, setEnrolledMembersDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [newProgramName, setNewProgramName] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState(null);
  
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
  
  // Data fetching states
  const [programs, setPrograms] = useState([]);
  const [stats, setStats] = useState({
    totalPrograms: 0,
    clientsEnrolled: 0,
    clientsCompleted: 0,
    totalElements: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolledClients, setEnrolledClients] = useState({});
  const [loadingClients, setLoadingClients] = useState({});
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Fetch programs data
  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/temp_programs');
      if (!response.ok) {
        throw new Error('Failed to fetch programs');
      }
      
      const data = await response.json();
      setPrograms(data.programs || []);
      setStats({
        totalPrograms: data.stats?.totalProgramTemplates || 0,
        clientsEnrolled: data.stats?.enrolledClients || 0,
        clientsCompleted: data.stats?.completedClients || 0,
        totalElements: data.programs?.reduce((sum, program) => sum + Number(program.elementCount || 0), 0) || 0
      });
    } catch (err) {
      console.error('Error fetching programs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load programs on component mount
  useEffect(() => {
    fetchPrograms();
  }, []);

  const duplicateProgram = async (programId, newName) => {
    try {
      const response = await fetch(`/api/temp_programs/${programId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to duplicate program');
      }

      const result = await response.json();
      // Refresh the programs list
      await fetchPrograms();
      toast.success('Program duplicated successfully!');
      return result;
    } catch (error) {
      console.error('Error duplicating program:', error);
      throw error;
    }
  };

  const handleDuplicate = async () => {
    if (!selectedProgram || !newProgramName.trim()) return;
    
    try {
      setIsDuplicating(true);
      await duplicateProgram(selectedProgram.id, newProgramName);
      setDuplicateDialogOpen(false);
      setNewProgramName('');
      setSelectedProgram(null);
    } catch (error) {
      console.error('Failed to duplicate program:', error);
      toast.error(error.message || 'Failed to duplicate program');
    } finally {
      setIsDuplicating(false);
    }
  };

  const deleteProgram = async (programId) => {
    try {
      const response = await fetch(`/api/temp_programs/${programId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete program');
      }

      // Refresh the programs list
      await fetchPrograms();
      toast.success(t('programs.programDeleted'));
    } catch (error) {
      console.error('Error deleting program:', error);
      throw error;
    }
  };

  const handleDelete = async (programId) => {
    try {
      await deleteProgram(programId);
    } catch (error) {
      console.error('Failed to delete program:', error);
      toast.error(error.message || 'Failed to delete program');
    }
  };

  const handleEditProgram = async (programId) => {
    try {
      setEditingProgramId(programId);
      // Small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      router.push(`/coach/programs/${programId}/edit`);
    } catch (error) {
      console.error('Failed to navigate to edit program:', error);
      toast.error('Failed to open program editor');
    } finally {
      setEditingProgramId(null);
    }
  };

  // Fetch enrolled clients for a specific program
  const fetchEnrolledClients = async (programId) => {
    try {
      setLoadingClients(prev => ({ ...prev, [programId]: true }));
      
      const response = await fetch(`/api/programs/${programId}/enrolled-clients`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch enrolled clients');
      }
      
      const data = await response.json();
      
      setEnrolledClients(prev => ({
        ...prev,
        [programId]: data.clients || []
      }));
      
    } catch (error) {
      console.error('Error fetching enrolled clients:', error);
      toast.error('Failed to fetch enrolled clients');
      
      // Set empty array on error
      setEnrolledClients(prev => ({
        ...prev,
        [programId]: []
      }));
    } finally {
      setLoadingClients(prev => ({ ...prev, [programId]: false }));
    }
  };

  // Get enrolled clients (with caching)
  const getEnrolledClients = (programId) => {
    // If we haven't fetched clients for this program yet, fetch them
    if (!enrolledClients[programId] && !loadingClients[programId]) {
      fetchEnrolledClients(programId);
      return []; // Return empty array while loading
    }
    
    return enrolledClients[programId] || [];
  };

  return (
    <div className={`page-container ${isMobile ? 'px-4 pb-24' : ''}`}>
      {/* Page Header */}
      <PageHeader 
        title={t('navigation.programs')} 
        subtitle={t('programs.managePrograms', 'Manage your programs')}
      >
        <div className={`flex gap-2 ${isMobile ? 'flex-col w-full' : ''}`}>
          <Button 
            onClick={() => router.push('/coach/programs/create')} 
            className={`bg-gradient-primary text-[#1A2D4D] shadow-medium hover:shadow-strong transition-all flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8 w-full' : 'gap-2'}`} 
            size={isMobile ? "sm" : "default"}
          >
            <Plus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-[#1A2D4D]`}/>
            {isMobile ? 'Create' : t('programs.createProgram')}
          </Button>
          <Button 
            onClick={() => setAiModalOpen(true)} 
            variant="outline"
            className={`flex items-center ${isMobile ? 'gap-1 text-xs px-2 h-8 w-full' : 'gap-2'}`} 
            size={isMobile ? "sm" : "default"}
          >
            <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`}/>
            {isMobile ? 'AI Assist' : 'AI Assist Program'}
          </Button>
        </div>
      </PageHeader>

      {/* KPI Dashboard */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3 mb-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6'}`}>
        <StatsCard
          title={t('programs.totalPrograms', 'Total Programs')}
          value={stats.totalPrograms}
          icon={Target}
          iconColor="bg-primary"
        />
        
        <StatsCard
          title={t('programs.clientsEnrolled', 'Clients Enrolled')}
          value={stats.clientsEnrolled}
          icon={Users}
          iconColor="bg-blue-500"
        />
        
        <StatsCard
          title={t('programs.clientsCompleted', 'Clients Completed')}
          value={stats.clientsCompleted}
          icon={CheckCircle}
          iconColor="bg-green-500"
        />
        
        <StatsCard
          title={t('programs.totalElements', 'Total Elements')}
          value={stats.totalElements}
          icon={Target}
          iconColor="bg-purple-500"
        />
      </div>

      {/* Programs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('programs.loading', 'Loading programs...')}</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('programs.errorLoading', 'Error Loading Programs')}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchPrograms} variant="outline">
              {t('common.buttons.tryAgain', 'Try Again')}
            </Button>
          </div>
        </div>
      ) : programs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('programs.noPrograms', 'No Programs Yet')}</h3>
            <p className="text-muted-foreground mb-4">{t('programs.createFirstProgram', 'Create your first program to get started')}</p>
          </div>
        </div>
      ) : (
        <div className={`grid-responsive ${isMobile ? 'grid grid-cols-1 gap-3' : ''}`}>
          {programs.map((program) => {
          const enrolledClients = getEnrolledClients(program.id);
          const clientCount = enrolledClients.length;
          
          return (
            <Card key={program.id} className={`card-hover ${isMobile ? 'p-3' : ''}`}>
              <CardHeader className={isMobile ? 'pb-3 px-0' : ''}>
                <div className={`flex items-start ${isMobile ? 'flex-col gap-2' : 'justify-between'}`}>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'}`}>{program.name}</CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className={`space-y-4 ${isMobile ? 'px-0 space-y-3' : ''}`}>
                <CardDescription className={`${isMobile ? 'text-xs' : 'text-sm'} line-clamp-2`}>
                  {program.description}
                </CardDescription>
                
                <div className={`grid grid-cols-3 ${isMobile ? 'gap-2 py-2' : 'gap-4 py-3'} text-center bg-muted/50 rounded-lg`}>
                  <div>
                    <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>{t('programs.duration')}</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>{program.duration} {t('programs.weeks')}</p>
                  </div>
                  <div>
                    <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>{t('programs.elements')}</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>{program.elementCount || 0}</p>
                  </div>
                  <div>
                    <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>{t('programs.enrolled')}</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>
                      {loadingClients[program.id] ? '...' : clientCount}
                    </p>
                  </div>
                </div>

                <div className={`flex gap-2 pt-2 flex-wrap ${isMobile ? 'flex-col' : ''}`}>
                  <Button
                    size={isMobile ? "sm" : "sm"}
                    onClick={() => handleEditProgram(program.id)}
                    disabled={editingProgramId === program.id}
                    className={`${isMobile ? 'w-full text-xs h-8' : 'flex-1'} flex items-center gap-2`}
                  >
                    {editingProgramId === program.id ? (
                      <>
                        <div className={`animate-spin rounded-full ${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} border-b-2 border-white`}></div>
                        {t('programs.opening', 'Opening...')}
                      </>
                    ) : (
                      <>
                        <Edit className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                        {isMobile ? 'Edit' : t('programs.editProgram')}
                      </>
                    )}
                  </Button>
                  
                  <Button
                    size={isMobile ? "sm" : "sm"}
                    variant="outline"
                    className={`${isMobile ? 'w-full text-xs h-8' : 'shrink-0'}`}
                    disabled={loadingClients[program.id]}
                    onClick={() => {
                      const enrolledClients = getEnrolledClients(program.id);
                      setSelectedProgram(program);
                      setEnrolledMembersDialogOpen(true);
                    }}
                  >
                    <Users className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                    {loadingClients[program.id] && <span className={isMobile ? 'ml-0.5' : 'ml-1'}>...</span>}
                    {isMobile && <span className="ml-1">Members</span>}
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size={isMobile ? "sm" : "sm"}
                        variant="outline"
                        className={`${isMobile ? 'w-full text-xs h-8' : 'shrink-0'}`}
                        onClick={() => {
                          setSelectedProgram(program);
                          setNewProgramName(`${program.name} (Copy)`);
                          setDuplicateDialogOpen(true);
                        }}
                      >
                        <Copy className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                        {isMobile && <span className="ml-1">Duplicate</span>}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t('programs.duplicateProgram')}</DialogTitle>
                        <DialogDescription>
                          {t('programs.duplicateProgramDesc')} {selectedProgram?.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="program-name">{t('programs.programName')}</Label>
                          <Input
                            id="program-name"
                            value={newProgramName}
                            onChange={(e) => setNewProgramName(e.target.value)}
                            placeholder={t('programs.programName')}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setDuplicateDialogOpen(false)}
                          disabled={isDuplicating}
                        >
                          {t('common.buttons.cancel')}
                        </Button>
                        <Button 
                          onClick={handleDuplicate}
                          disabled={isDuplicating}
                          className="flex items-center gap-2"
                        >
                          {isDuplicating && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          )}
                          {isDuplicating ? t('programs.creatingCopy', 'Creating Copy...') : t('programs.createCopy', 'Create Copy')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          {t('programs.deleteProgram')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('common.messages.confirmDelete', 'Are you sure you want to delete')} {program.name}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.buttons.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(program.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('programs.deleteProgram')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}


      {/* Enrolled Members Dialog */}
      <EnrolledMembersDialog
        isOpen={enrolledMembersDialogOpen}
        onClose={() => setEnrolledMembersDialogOpen(false)}
        programName={selectedProgram?.name || ''}
        enrolledClients={selectedProgram ? getEnrolledClients(selectedProgram.id) : []}
      />

      {/* AI Assist Program Modal */}
      <AIAssistProgramModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
      />
    </div>
  );
}