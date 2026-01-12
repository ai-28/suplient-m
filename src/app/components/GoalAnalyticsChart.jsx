"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Target, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/app/components/ui/carousel";
import { useState } from "react";
import PolarAreaChart from "./PolarAreaChart";
import { useTranslation } from "@/app/context/LanguageContext";

export function GoalAnalyticsChart({ 
  data, 
  // historicalData = [],
  onTimePeriodChange,
  selectedPeriod = 'today'
}) {
  const t = useTranslation();
  const handleTimePeriodChange = (period) => {
    onTimePeriodChange?.(period);
  };
  // Transform historical data for line chart - use real goal scores (1-5)
  // const lineChartData = historicalData.map((entry) => ({
  //   date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  //   ...data.reduce((acc, goal) => {
  //     // Use actual goal scores from the daily entry
  //     acc[goal.name] = entry.goalScores[goal.id] || 0;
  //     return acc;
  //   }, {})
  // }));

  // Empty state - only show if no goals exist at all
  if (data.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('analytics.noActiveGoals', 'No Active Goals')}</h3>
            <p className="text-muted-foreground">
              {t('analytics.setupGoalsForVisualization', 'Set up some goals to see your progress visualization.')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const PolarAreaView = () => {
    // Prepare data for Chart.js Polar Area Chart
    const polarData = {
      labels: data.map(item => item.name),
      datasets: [
        {
          label: t('analytics.goalPerformance', 'Goal Performance'),
          data: data.map(item => item.value),
          backgroundColor: data.map(item => item.color + '80'), // Add transparency
          borderColor: '#ffffff', // White border color
          borderWidth: 1,
        },
      ],
    };

    const polarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false, // We'll use our custom legend
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.parsed.r} / 5`;
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
            showLabelBackdrop: false,
            backdropColor: 'transparent'
          },
          grid: {
            color: '#e5e7eb', // Light gray
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
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">{t('analytics.polarAreaChart', 'Wheel of life')}</h3>
        </div>
        
        {/* Polar Area Chart */}
        <div className="h-80 w-full">
          <PolarAreaChart data={polarData} options={polarOptions} />
        </div>

        {/* Time period buttons */}
        <div className="flex justify-center gap-1.5">
          <Button 
            key="today"
            variant={selectedPeriod === 'today' ? "secondary" : "outline"} 
            size="sm"
            onClick={() => handleTimePeriodChange('today')}
            className="text-xs px-3 py-1"
          >
            {t('common.time.today', 'Today')}
          </Button>
          <Button 
            key="week"
            variant={selectedPeriod === 'week' ? "secondary" : "outline"} 
            size="sm"
            onClick={() => handleTimePeriodChange('week')}
            className="text-xs px-3 py-1"
          >
            {t('analytics.week', 'Week')}
          </Button>
          <Button 
            key="month"
            variant={selectedPeriod === 'month' ? "secondary" : "outline"} 
            size="sm"
            onClick={() => handleTimePeriodChange('month')}
            className="text-xs px-3 py-1"
          >
            {t('analytics.month', 'Month')}
          </Button>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-1.5">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs">{item.icon}</span>
              <span className="text-xs font-medium truncate">{item.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">{item.value}/5</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // const LineGraphView = () => {
  //   // Show empty state if no historical data
  //   if (lineChartData.length === 0) {
  //     return (
  //       <div className="space-y-4">
  //         <div className="text-center">
  //           <h3 className="text-lg font-semibold">{t('analytics.lineGraphView', 'Line Graph View')}</h3>
  //           <p className="text-sm text-muted-foreground">{t('analytics.progressTrendsOverTime', 'Progress trends over time')}</p>
  //         </div>
  //         <div className="h-80 w-full flex items-center justify-center">
  //           <div className="text-center text-muted-foreground">
  //             <p>{t('analytics.noHistoricalData', 'No historical data available')}</p>
  //             <p className="text-sm">{t('analytics.completeCheckInsForTrends', 'Complete some check-ins to see your progress trends')}</p>
  //           </div>
  //         </div>
  //       </div>
  //     );
  //   }

  //   return (
  //     <div className="space-y-4">
  //       <div className="text-center">
  //         <h3 className="text-lg font-semibold">{t('analytics.lineGraphView', 'Line Graph View')}</h3>
  //         <p className="text-sm text-muted-foreground">{t('analytics.progressTrendsOverTime', 'Progress trends over time')}</p>
  //       </div>
        
  //       {/* Line Chart */}
  //       <div className="h-80 w-full">
  //         <ResponsiveContainer width="100%" height="100%">
  //           <LineChart data={lineChartData}>
  //             <XAxis 
  //               dataKey="date" 
  //               stroke="hsl(var(--muted-foreground))"
  //               fontSize={12}
  //             />
  //             <YAxis 
  //               stroke="hsl(var(--muted-foreground))"
  //               fontSize={12}
  //               domain={[0, 5]}
  //               label={{ value: t('analytics.rating', 'Rating (0-5)'), angle: -90, position: 'insideLeft' }}
  //             />
  //             <Tooltip 
  //               contentStyle={{
  //                 backgroundColor: "hsl(var(--background))",
  //                 border: "1px solid hsl(var(--border))",
  //                 borderRadius: "6px"
  //               }}
  //             />
  //             <Legend />
  //             {data.map((goal, index) => (
  //               <Line
  //                 key={`${goal.name}-${index}`}
  //                 type="monotone"
  //                 dataKey={goal.name}
  //                 stroke={goal.color}
  //                 strokeWidth={2}
  //                 dot={{ fill: goal.color, strokeWidth: 2, r: 4 }}
  //                 activeDot={{ r: 6, fill: goal.color }}
  //               />
  //             ))}
  //           </LineChart>
  //         </ResponsiveContainer>
  //       </div>

  //       {/* Time period buttons */}
  //       <div className="flex justify-center gap-1.5">
  //         <Button 
  //           variant={selectedPeriod === 'today' ? "secondary" : "outline"} 
  //           size="sm"
  //           onClick={() => handleTimePeriodChange('today')}
  //           className="text-xs px-3 py-1"
  //         >
  //           Today
  //         </Button>
  //         <Button 
  //           variant={selectedPeriod === 'week' ? "secondary" : "outline"} 
  //           size="sm"
  //           onClick={() => handleTimePeriodChange('week')}
  //           className="text-xs px-3 py-1"
  //         >
  //           Week
  //         </Button>
  //         <Button 
  //           variant={selectedPeriod === 'month' ? "secondary" : "outline"} 
  //           size="sm"
  //           onClick={() => handleTimePeriodChange('month')}
  //           className="text-xs px-3 py-1"
  //         >
  //           Month
  //         </Button>
  //       </div>

  //       {/* Goal Legend */}
  //       <div className="grid grid-cols-2 gap-1.5">
  //         {data.map((item, index) => (
  //           <div key={index} className="flex items-center gap-1.5">
  //             <div 
  //               className="w-2.5 h-0.5" 
  //               style={{ backgroundColor: item.color }}
  //             />
  //             <span className="text-xs">{item.icon}</span>
  //             <span className="text-xs font-medium truncate">{item.name}</span>
  //           </div>
  //         ))}
  //       </div>
  //     </div>
  //   );
  // };

  return (
    <Card>
      <CardContent>
        <div className="relative">
          <Carousel className="w-full">
            <CarouselContent>
              <CarouselItem key="polar-area-view">
                <PolarAreaView />
              </CarouselItem>
              {/* <CarouselItem key="line-graph-view">
                <LineGraphView />
              </CarouselItem> */}
            </CarouselContent>
            {/* <CarouselPrevious className="absolute top-8 left-4 z-10" />
            <CarouselNext className="absolute top-8 right-4 z-10" /> */}
          </Carousel>
        </div>
      </CardContent>
    </Card>
  );
}
