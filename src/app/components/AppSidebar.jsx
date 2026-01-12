"use client"

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Home, 
  User, 
  Users, 
  Library, 
  ClipboardList, 
  Calendar,
  Settings,
  HelpCircle,
  MessageSquare,
  Shield,
  BookOpen,
  Search,
  Target,
  ArrowRight,
  X,
  BarChart3,
  FileText,
  Database,
  Bell,
  UserCog,
  Loader2,
  MessageCircle
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/app/components/ui/sidebar";
import { useAdminCommunicationStats } from "@/app/hooks/useAdminCommunicationStats";
import { Badge } from "@/app/components/ui/badge";
import { useTranslation } from "@/app/context/LanguageContext";

// Component for Admin Communication Badge
function AdminCommunicationBadge() {
  const { totalNotifications } = useAdminCommunicationStats();
  
  if (totalNotifications === 0) return null;
  
  return (
    <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
      {totalNotifications > 99 ? '99+' : totalNotifications}
    </Badge>
  );
}


export function AppSidebar() {
  const { open } = useSidebar();
  const router = useRouter();
  const currentPath = usePathname();
  const t = useTranslation();

  const searchRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Determine if we're in admin or coach section
  const isAdmin = currentPath.startsWith('/admin');
  const isCoach = currentPath.startsWith('/coach');

  const isActive = (path) => {
    // Exact match for root paths
    if (path === '/coach' || path === '/admin') {
      return currentPath === path;
    }
    // For other paths, check if current path starts with the nav item path
    return currentPath.startsWith(path);
  };
  
  const getNavCls = ({ isActive }) =>
    isActive 
      ? "bg-primary/10 text-primary font-medium" 
      : "text-sidebar-foreground hover:bg-muted/50 hover:text-foreground";

  // Perform search
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ results: {}, totalResults: 0, query });
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        performSearch(searchQuery);
      }, 300); // 300ms debounce
      setDebounceTimer(timer);
    } else {
      setSearchResults(null);
      setIsSearching(false);
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [searchQuery, performSearch]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setIsSearching(false);
  };

  // Handle search result click
  const handleResultClick = (url) => {
    router.push(url);
    clearSearch();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  };

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        // Don't close if clicking on a result
        if (!event.target.closest('[data-search-result]')) {
          // Keep search query but close dropdown after a delay
          // Actually, let's keep it open while typing
        }
      }
    };

    if (searchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [searchResults]);

  // Prepare results by category
  const getResultsByCategory = () => {
    if (!searchResults || !searchResults.results) return [];

    const categories = [
      [t('navigation.clients', 'Clients'), searchResults.results.clients || [], User],
      [t('navigation.groups', 'Groups'), searchResults.results.groups || [], Users],
      [t('navigation.sessions', 'Sessions'), searchResults.results.sessions || [], Calendar],
      [t('navigation.tasks', 'Tasks'), searchResults.results.tasks || [], ClipboardList],
      [t('navigation.notes', 'Notes'), searchResults.results.notes || [], FileText],
      [t('navigation.library', 'Library'), searchResults.results.resources || [], Library],
    ];

    return categories.filter(([_, results]) => results.length > 0);
  };

  const categoriesWithResults = getResultsByCategory();
  const totalResults = searchResults?.totalResults || 0;
  const showResults = searchQuery.trim().length >= 2 && searchResults !== null;

  // Navigation items based on role
  const getMainNavItems = () => {
    if (isAdmin) {
      return [
        { title: t('navigation.dashboard', 'Dashboard'), url: "/admin/dashboard", icon: Home },
        { title: t('navigation.coaches', 'Coaches'), url: "/admin/coaches", icon: User },
        { title: t('navigation.clients', 'Clients'), url: "/admin/clients", icon: Users },
        { title: t('navigation.notes', 'Note'), url: "/admin/note", icon: Bell },
        { title: t('navigation.adminUsers', 'Admin Users'), url: "/admin/admin-users", icon: UserCog },
        // { title: "Chat", url: "/admin/chat", icon: MessageSquare },
      ];
    } else if (isCoach) {
      return [
        { title: t('navigation.dashboard', 'Dashboard'), url: "/coach/dashboard", icon: Home },
        { title: t('navigation.clients', 'Clients'), url: "/coach/clients", icon: User },
        { title: t('navigation.groups', 'Groups'), url: "/coach/groups", icon: Users },
        { title: t('navigation.resources', 'Library'), url: "/coach/library", icon: Library },
        { title: t('navigation.programs', 'Programs'), url: "/coach/programs", icon: Target },
        { title: t('navigation.tasks', 'Tasks'), url: "/coach/tasks", icon: ClipboardList },
        { title: t('navigation.sessions', 'Sessions'), url: "/coach/sessions", icon: Calendar },
      ];
    }
    return [];
  };

  const getBottomNavItems = () => {
    if (isAdmin) {
      return [
        { title: t('navigation.settings', 'Settings'), url: "/admin/settings", icon: Settings },
        { title: t('navigation.help', 'Help'), url: "/admin/help", icon: HelpCircle },
      ];
    } else if (isCoach) {
      return [
        { title: t('navigation.settings', 'Settings'), url: "/coach/settings", icon: Settings },
        { title: t('navigation.admin', 'Admin'), url: "/coach/admin-communication", icon: MessageCircle },
      ];
    }
    return [];
  };

  const main = getMainNavItems();
  const bottom = getBottomNavItems();

  return (
    <Sidebar
      side="left"
      className="transition-all duration-300 bg-sidebar border-r border-sidebar-border shadow-medium"
      collapsible="icon"
    >
      <SidebarContent className="py-6">
        {/* Logo Section */}
        {open && (
          <div className="px-6 mb-4 flex justify-center">
            <img 
              src="/assets/logo.png" 
              alt="Suplient logo" 
              className="object-contain" 
              style={{ width: '150px', height: '150px' }}
            />
          </div>
        )}

        {/* Global Search - Only for coaches */}
        {open && isCoach && (
          <div className="px-6 mb-2 relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sidebar-foreground/60" />
              <Input
                placeholder={t('sidebar.searchPlaceholder', 'Search clients, notes, files, groups, sessions...')}
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10 bg-sidebar-accent/30 border-sidebar-border/50 text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus:bg-sidebar-accent/50 focus:border-sidebar-primary/50 focus:ring-1 focus:ring-sidebar-primary/30 transition-all"
              />
              {searchQuery && (
                <>
                  {isSearching ? (
                    <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-sidebar-foreground/60" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-sidebar-accent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && (
              <Card className="text-white absolute left-6 right-6 top-full mt-2 z-50 max-h-96 overflow-hidden shadow-lg border-sidebar-border bg-sidebar">
                <CardContent className="p-0">
                  {isSearching ? (
                    <div className="p-6 text-center">
                      <Loader2 className="h-6 w-6 text-sidebar-foreground/60 mx-auto mb-2 animate-spin" />
                      <div className="text-sm text-sidebar-foreground/60">{t('sidebar.searching', 'Searching...')}</div>
                    </div>
                  ) : totalResults > 0 ? (
                    <div className="max-h-96 overflow-y-auto">
                      <div className="p-3 border-b border-sidebar-border">
                        <div className="text-sm font-medium text-sidebar-foreground">
                          {totalResults === 1 
                            ? t('sidebar.searchResultFound', '{count} result found', { count: totalResults })
                            : t('sidebar.searchResultsFound', '{count} results found', { count: totalResults })}
                        </div>
                      </div>
                      {categoriesWithResults.map(([category, results, Icon]) => (
                        <div key={category} className="border-b border-sidebar-border/50 last:border-b-0">
                          <div className="px-3 py-2 bg-sidebar-accent/20 flex items-center gap-2">
                            <Icon className="h-3 w-3 text-sidebar-foreground/70" />
                            <div className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wide">
                              {category} ({results.length})
                            </div>
                          </div>
                          <div className="max-h-32 overflow-y-auto">
                            {results.slice(0, 3).map((result) => (
                              <button
                                key={result.id}
                                data-search-result
                                onClick={() => handleResultClick(result.url)}
                                className="w-full px-3 py-2 text-left hover:bg-sidebar-accent/30 transition-colors group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-sidebar-foreground truncate">
                                      {result.title}
                                    </div>
                                    <div className="text-xs text-sidebar-foreground/60 truncate">
                                      {result.description}
                                    </div>
                                  </div>
                                  <ArrowRight className="h-3 w-3 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70 ml-2 flex-shrink-0" />
                                </div>
                              </button>
                            ))}
                            {results.length > 3 && (
                              <button
                                data-search-result
                                onClick={() => {
                                  // Navigate to the category page instead of specific item
                                  const baseUrl = results[0]?.url?.split('/').slice(0, -1).join('/') || (isAdmin ? `/admin/${category.toLowerCase()}` : `/coach/${category.toLowerCase()}`);
                                  handleResultClick(baseUrl);
                                }}
                                className="text-white w-full px-3 py-1 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/20 transition-colors"
                              >
                                {t('sidebar.viewAllResults', 'View all {count} {category} results', { count: results.length, category })}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-white">
                      <Search className="h-8 w-8 text-sidebar-foreground/40 mx-auto mb-2" />
                      <div className="text-sm text-sidebar-foreground/60">
                        {t('sidebar.noResultsFound', 'No results found for "{query}"').replace('{query}', searchResults?.query || searchQuery)}
                      </div>
                      <div className="text-xs text-sidebar-foreground/40 mt-1">
                        {t('sidebar.trySearching', 'Try searching for clients, groups, tasks, sessions, notes, or library content')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup className={!open ? "mt-12" : ""}>
          {open && (
            <SidebarGroupLabel className="text-sidebar-foreground text-xs uppercase tracking-wider px-6 mb-4">
              {isAdmin ? t('navigation.adminNavigation', 'Admin Navigation') : t('navigation.coachNavigation', 'Menu')}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => {
                const isAdminComm = item.url === '/coach/admin-communication' && isCoach;
                return (
                  <SidebarMenuItem key={item.title} className="list-none">
                    <Link 
                      href={item.url} 
                      className={`flex items-center justify-between ${open ? 'px-6' : 'px-2 justify-center'} py-3 transition-colors rounded-none ${getNavCls({ isActive: isActive(item.url) })}`}
                    >
                      <div className="flex items-center">
                        <item.icon className={`${open ? 'h-5 w-5' : 'h-6 w-6'} flex-shrink-0`} />
                        {open && <span className="ml-3">{item.title}</span>}
                      </div>
                      {isAdminComm && open && (
                        <AdminCommunicationBadge />
                      )}
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Navigation */}
        <div className="mt-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {bottom.map((item) => (
                  <SidebarMenuItem key={item.title} className="list-none">
                    <Link 
                      href={item.url} 
                      className={`flex items-center ${open ? 'px-6' : 'px-2 justify-center'} py-3 transition-colors rounded-none ${getNavCls({ isActive: isActive(item.url) })}`}
                    >
                      <item.icon className={`${open ? 'h-5 w-5' : 'h-6 w-6'} flex-shrink-0`} />
                      {open && <span className="ml-3">{item.title}</span>}
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>

      {/* Toggle Button */}
      <SidebarTrigger className="absolute -right-4 top-6 bg-sidebar-primary text-sidebar-primary-foreground rounded-full p-2 shadow-medium hover:bg-sidebar-accent transition-colors" />
    </Sidebar>
  );
}