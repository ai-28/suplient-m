"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Users, Building2, TrendingUp, Shield } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/app/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useTranslation } from "@/app/context/LanguageContext";
import { useState, useEffect } from "react";

const monthlyData = [
  { month: "Jan", coaches: 18, clients: 95 },
  { month: "Feb", coaches: 20, clients: 110 },
  { month: "Mar", coaches: 19, clients: 125 },
  { month: "Apr", coaches: 22, clients: 140 },
  { month: "May", coaches: 23, clients: 145 },
  { month: "Jun", coaches: 24, clients: 156 },
];

const incomeData = [
  { month: "Jan", income: 12500 },
  { month: "Feb", income: 15200 },
  { month: "Mar", income: 18900 },
  { month: "Apr", income: 22100 },
  { month: "May", income: 24800 },
  { month: "Jun", income: 28400 },
];

// These will be updated inside the component to use translations
const getChartConfig = (t) => ({
  coaches: {
    label: t("dashboard.admin.coaches"),
    color: "hsl(var(--primary))",
  },
  clients: {
    label: t("dashboard.admin.clients"), 
    color: "hsl(var(--accent))",
  },
});

const getIncomeChartConfig = (t) => ({
  income: {
    label: t("dashboard.admin.revenue"),
    color: "hsl(var(--success))",
  },
});

export default function AdminDashboard() {
  const t = useTranslation();
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640); // sm breakpoint
      setIsTablet(width >= 640 && width < 1024); // md breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  return (
    <div className={`space-y-8 ${isMobile ? 'px-4 pb-24' : ''}`}>
      <div>
        <h1 className={`font-bold tracking-tight ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{t("dashboard.admin.title")}</h1>
        <p className={`text-muted-foreground ${isMobile ? 'text-sm mt-1' : 'mt-2'}`}>
          {t("dashboard.admin.subtitle")}
        </p>
      </div>

      {/* Key Metrics */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        <Card className={isMobile ? 'p-3' : ''}>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-2 px-0' : 'pb-2'}`}>
            <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>{t("dashboard.admin.activeCoaches")}</CardTitle>
            <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
          </CardHeader>
          <CardContent className={isMobile ? 'px-0 pt-2' : ''}>
            <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>22/24</div>
            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>+3 active {t("dashboard.admin.fromLastMonth")}</p>
            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-success mt-1`}>91.7% {t("dashboard.admin.activityRate")}</p>
          </CardContent>
        </Card>
        
        <Card className={isMobile ? 'p-3' : ''}>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-2 px-0' : 'pb-2'}`}>
            <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>{t("dashboard.admin.activeClients")}</CardTitle>
            <Users className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
          </CardHeader>
          <CardContent className={isMobile ? 'px-0 pt-2' : ''}>
            <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>142/156</div>
            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>+18 active {t("dashboard.admin.fromLastMonth")}</p>
            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-success mt-1`}>91.0% {t("dashboard.admin.activityRate")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
        {/* Monthly Growth Chart */}
        <Card className={`w-full ${isMobile ? 'p-3' : ''}`}>
          <CardHeader className={isMobile ? 'px-0 pb-3' : ''}>
            <CardTitle className={isMobile ? 'text-base' : ''}>{t("dashboard.admin.monthlyGrowth")}</CardTitle>
            <CardDescription className={isMobile ? 'text-xs' : ''}>{t("dashboard.admin.monthlyGrowthDesc")}</CardDescription>
          </CardHeader>
          <CardContent className={isMobile ? 'p-2 px-0' : 'p-4'}>
            <ChartContainer config={getChartConfig(t)} className={`${isMobile ? 'h-[200px]' : 'h-[250px] sm:h-[300px]'} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barCategoryGap="20%" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="coaches" 
                    fill="var(--color-coaches)"
                    radius={[2, 2, 0, 0]}
                    name={t("dashboard.admin.coaches")}
                  />
                  <Bar 
                    dataKey="clients" 
                    fill="var(--color-clients)"
                    radius={[2, 2, 0, 0]}
                    name={t("dashboard.admin.clients")}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Income Chart */}
        <Card className={`w-full ${isMobile ? 'p-3' : ''}`}>
          <CardHeader className={isMobile ? 'px-0 pb-3' : ''}>
            <CardTitle className={isMobile ? 'text-base' : ''}>{t("dashboard.admin.monthlyRevenue")}</CardTitle>
            <CardDescription className={isMobile ? 'text-xs' : ''}>{t("dashboard.admin.monthlyRevenueDesc")}</CardDescription>
          </CardHeader>
          <CardContent className={isMobile ? 'p-2 px-0' : 'p-4'}>
            <ChartContainer config={getIncomeChartConfig(t)} className={`${isMobile ? 'h-[200px]' : 'h-[250px] sm:h-[300px]'} w-full`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value) => [`$${value.toLocaleString()}`, t("dashboard.admin.revenue")]}
                    />} 
                  />
                  <Bar 
                    dataKey="income" 
                    fill="var(--color-income)"
                    radius={[4, 4, 0, 0]}
                    name={t("dashboard.admin.revenue")}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      {/* Recent Activity */}
      <Card className={isMobile ? 'p-3' : ''}>
        <CardHeader className={isMobile ? 'px-0 pb-3' : ''}>
          <CardTitle className={isMobile ? 'text-base' : ''}>{t("dashboard.admin.recentCoachRegistrations")}</CardTitle>
          <CardDescription className={isMobile ? 'text-xs' : ''}>{t("dashboard.admin.latestCoachesJoined")}</CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'px-0' : ''}>
          <div className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
            <div className="flex items-center">
              <div className={`${isMobile ? 'ml-0' : 'ml-4'} space-y-1`}>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Dr. Sarah Johnson</p>
                <p className={`${isMobile ? 'text-[10px]' : 'text-sm'} text-muted-foreground`}>{t("dashboard.admin.joined")} 2 {t("dashboard.admin.daysAgo")}</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className={`${isMobile ? 'ml-0' : 'ml-4'} space-y-1`}>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Michael Chen</p>
                <p className={`${isMobile ? 'text-[10px]' : 'text-sm'} text-muted-foreground`}>{t("dashboard.admin.joined")} 5 {t("dashboard.admin.daysAgo")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}