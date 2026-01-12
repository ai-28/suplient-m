"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Search, BookOpen, Play, Download, Star, Filter, X, Eye, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/app/context/LanguageContext";

// Categories will be translated inline

// Real useResources hook with API calls
const useResources = () => {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  
  // Fetch resources from API
  const fetchResources = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/resources');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Resources API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch resources');
      }
      
      const data = await response.json();
      setResources(data.resources || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError(err.message);
      setResources([]); // Fallback to empty array
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch resources on component mount
  useEffect(() => {
    fetchResources();
  }, []);
  
  // Handle resource preview (Play/Read)
  const handleResourcePreview = async (resource) => {
    try {
      const response = await fetch(`/api/resources/${resource.id}/access?action=access`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to access resource');
      }
      
      const data = await response.json();
      
      // Determine preview type based on resource type
      let previewType = 'document';
      if (resource.type === 'Video') {
        previewType = 'video';
      } else if (resource.type === 'Image') {
        previewType = 'image';
      } else if (resource.type === 'Audio' || resource.type === 'Sound') {
        previewType = 'audio';
      } else if (resource.type === 'Article') {
        // Check if it's a PDF
        const fileName = resource.fileName || resource.title || '';
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        previewType = fileExtension === 'pdf' ? 'pdf' : 'document';
      }
      
      // Set preview data
      setPreviewUrl(data.resource.url);
      setPreviewType(previewType);
      
      toast.success(t('resources.openingPreview', 'Opening {type} preview...', { type: resource.type.toLowerCase() }));
    } catch (error) {
      console.error('Error accessing resource:', error);
      toast.error(error.message || t('resources.accessFailed', 'Failed to access resource'));
    }
  };
  
  // Handle resource download
  const handleResourceDownload = async (resource) => {
    try {
      const response = await fetch(`/api/resources/${resource.id}/access?action=download`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download resource');
      }
      
      const data = await response.json();
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = data.resource.url;
      link.download = data.resource.fileName || resource.title;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(t('resources.downloading', 'Downloading {title}...', { title: resource.title }));
    } catch (error) {
      console.error('Error downloading resource:', error);
      toast.error(error.message || t('resources.downloadFailed', 'Failed to download resource'));
    }
  };
  
  return { 
    resources, 
    isLoading, 
    error,
    previewUrl,
    previewType,
    setPreviewUrl,
    setPreviewType,
    handleResourcePreview,
    handleResourceDownload,
    refetch: fetchResources 
  };
};

export default function ClientResources() {
  const router = useRouter();
  const t = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Videos");
  const [isMobile, setIsMobile] = useState(false);
  
  const { 
    resources, 
    isLoading, 
    error, 
    previewUrl, 
    previewType, 
    setPreviewUrl, 
    setPreviewType, 
    handleResourcePreview, 
    handleResourceDownload 
  } = useResources();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on mount
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = resource.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Article': return <BookOpen className="h-4 w-4" />;
      case 'Video': return <Play className="h-4 w-4" />;
      case 'Exercise': return <Heart className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Article': return 'default';
      case 'Video': return 'secondary';
      case 'Exercise': return 'outline';
      case 'Audio': return 'secondary';
      case 'Worksheet': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Loading State */}
      {isLoading && (
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('resources.loading', 'Loading resources...')}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('resources.errorLoading', 'Error loading resources')}</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  {t('common.buttons.tryAgain', 'Try Again')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content - only show when not loading and no error */}
      {!isLoading && !error && (
        <>
          <div className={`container mx-auto ${isMobile ? 'px-3 py-4' : 'px-4 py-6'} space-y-6`}>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>{t('resources.title', 'Resources')}</h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
            {t('resources.subtitle', 'Access helpful articles, exercises, and tools for your mental health journey.')}
          </p>
        </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className={`relative ${isMobile ? 'w-full' : 'max-w-md'}`}>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('resources.searchPlaceholder', 'Search resources...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-10 ${isMobile ? 'h-12 text-base' : ''}`}
          />
        </div>

        {isMobile ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-2 pb-2">
              {['Videos', 'Images', 'Articles', 'Sounds'].map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="shrink-0 h-9 px-4"
                >
                  {category === 'Videos' ? t('resources.categories.videos', 'Videos') :
                   category === 'Images' ? t('resources.categories.images', 'Images') :
                   category === 'Articles' ? t('resources.categories.articles', 'Articles') :
                   t('resources.categories.sounds', 'Sounds')}
                </Button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-wrap gap-2">
            {['Videos', 'Images', 'Articles', 'Sounds'].map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'Videos' ? t('resources.categories.videos', 'Videos') :
                 category === 'Images' ? t('resources.categories.images', 'Images') :
                 category === 'Articles' ? t('resources.categories.articles', 'Articles') :
                 t('resources.categories.sounds', 'Sounds')}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Resources Grid */}
      <div className={`${isMobile ? 'space-y-3' : 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'}`}>
        {filteredResources.map((resource) => (
          <Card key={resource.id} className={`${resource.completed ? "bg-muted/30" : ""} ${isMobile ? 'overflow-hidden' : ''}`}>
            {isMobile ? (
              // Mobile horizontal layout
              <div className="flex p-4">
                <div className="flex-shrink-0 mr-4 flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                  {getTypeIcon(resource.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getTypeColor(resource.type)} className="text-xs">
                      {resource.type}
                    </Badge>
                    {resource.completed && (
                      <Badge variant="secondary" className="text-xs">{t('resources.completed', 'Completed')}</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-base mb-1 truncate">{resource.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{resource.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">{resource.duration}</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs">{resource.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 h-9"
                      onClick={() => handleResourcePreview(resource)}
                    >
                      {resource.type === 'Video' || resource.type === 'Audio' ? t('resources.play', 'Play') : t('resources.read', 'Read')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-9 w-9"
                      onClick={() => handleResourceDownload(resource)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Desktop card layout
              <>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getTypeColor(resource.type)}>
                          {getTypeIcon(resource.type)}
                          <span className="ml-1">{resource.type}</span>
                        </Badge>
                        {resource.completed && (
                          <Badge variant="secondary">{t('resources.completed', 'Completed')}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                      <CardDescription>{resource.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">{resource.duration}</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm">{resource.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleResourcePreview(resource)}
                    >
                      {resource.type === 'Video' || resource.type === 'Audio' ? t('resources.play', 'Play') : t('resources.read', 'Read')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleResourceDownload(resource)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>

      {/* No resources message */}
      {filteredResources.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('resources.noResources', 'No resources found')}</h3>
              <p className="text-muted-foreground">
                {t('resources.adjustSearch', 'Try adjusting your search or filter criteria.')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{t('resources.preview', 'Preview')}</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setPreviewUrl(null);
                  setPreviewType(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              {previewType === 'image' ? (
                <div>
                  <img 
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-[70vh] object-contain mx-auto"
                    onError={(e) => {
                      console.error('❌ Image failed to load');
                      e.target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'text-center py-8';
                      fallback.innerHTML = `
                        <p class="text-muted-foreground mb-4">Preview failed to load</p>
                        <button 
                          class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          onclick="window.open('${previewUrl}', '_blank')"
                        >
                          {t('resources.openInNewTab', 'Open in New Tab')}
                        </button>
                      `;
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />
                </div>
              ) : previewType === 'video' ? (
                <video 
                  src={previewUrl}
                  controls
                  className="max-w-full max-h-[70vh] mx-auto"
                  onError={(e) => {
                    console.error('❌ Video failed to load');
                    e.target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'text-center py-8';
                    fallback.innerHTML = `
                      <p class="text-muted-foreground mb-4">Video failed to load</p>
                      <button 
                        class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        onclick="window.open('${previewUrl}', '_blank')"
                      >
                        {t('resources.openInNewTab', 'Open in New Tab')}
                      </button>
                    `;
                    e.target.parentNode.appendChild(fallback);
                  }}
                />
              ) : previewType === 'audio' ? (
                <audio 
                  src={previewUrl}
                  controls
                  className="w-full"
                  onError={(e) => {
                    console.error('❌ Audio failed to load');
                    e.target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'text-center py-8';
                    fallback.innerHTML = `
                      <p class="text-muted-foreground mb-4">Audio failed to load</p>
                      <button 
                        class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        onclick="window.open('${previewUrl}', '_blank')"
                      >
                        {t('resources.openInNewTab', 'Open in New Tab')}
                      </button>
                    `;
                    e.target.parentNode.appendChild(fallback);
                  }}
                />
              ) : previewType === 'pdf' ? (
                <div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">PDF Preview</h4>
                    <iframe
                      src={previewUrl}
                      className="w-full h-[60vh] border rounded"
                      title="PDF Preview"
                      onError={() => {
                        console.error('❌ PDF failed to load');
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        window.open(previewUrl, '_blank');
                      }}
                    >
                      {t('resources.openInNewTab', 'Open in New Tab')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">{t('resources.documentPreview', 'Document Preview')}</h4>
                    <div className="w-full h-[60vh] border rounded bg-gray-50 flex items-center justify-center">
                      <div className="text-center p-8">
                        <div className="mb-4">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('resources.documentPreview', 'Document Preview')}</h3>
                        <p className="text-sm text-gray-500 mb-6">
                          {t('resources.cannotPreview', 'This document type cannot be previewed directly in the browser. Please download the file to view it in a compatible application.')}
                        </p>
                        <div className="space-y-3">
                          <Button 
                            variant="default" 
                            className="w-full"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = previewUrl;
                              link.download = previewUrl.split('/').pop() || 'document';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            {t('resources.downloadDocument', 'Download Document')}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => {
                              window.open(previewUrl, '_blank');
                            }}
                          >
                            {t('resources.openInNewTab', 'Open in New Tab')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}