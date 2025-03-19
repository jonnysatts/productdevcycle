import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { formatCurrency, formatPercent } from '../lib/utils';
import useStore from '../store/useStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Area,
  ReferenceLine
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, DollarSign, AlertCircle, Calendar, Activity } from 'lucide-react';

const COLORS = {
  marketing: '#EF4444',  // red
  staffing: '#3B82F6',   // blue
  event: '#10B981',      // green
  setup: '#8B5CF6',      // purple
  fbCogs: '#F97316',     // orange
  merchCogs: '#EC4899',  // pink
  actual: '#22C55E',     // bright green for actuals
  forecast: '#93C5FD',   // light blue for forecasts
};

const PRODUCT_TYPE_COLORS = {
  'Experiential Events': '#8884d8',
  'Venue-Based Activations': '#82ca9d',
  'Food & Beverage Products': '#ffc658',
  'Merchandise Drops': '#ff8042',
  'Digital Products': '#a4de6c'
};

export default function ExecutiveDashboard() {
  const { products, currentProductId } = useStore();
  const [view, setView] = useState<'current' | 'portfolio'>('current');
  const currentProduct = products.find(p => p.info.id === currentProductId);
  
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No products available. Create a product to see the dashboard.
      </div>
    );
  }

  if (view === 'current' && !currentProduct) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="mb-4">No product selected or product not found.</div>
        <Button onClick={() => setView('portfolio')}>View Portfolio Dashboard</Button>
      </div>
    );
  }

  // CURRENT PRODUCT DASHBOARD
  if (view === 'current' && currentProduct) {
    const { weeklyProjections = [], costMetrics, risks = [], actuals = [] } = currentProduct;

    // Helper to get actual data for a specific week
    const getActualForWeek = (weekNumber: number) => {
      return actuals.find(a => a.week === weekNumber);
    };

    // Integrate actuals with projections for metrics calculations
    let totalRevenue = 0;
    let totalCosts = 0;
    let totalProfit = 0;
    let totalFootTraffic = 0;

    weeklyProjections.forEach(week => {
      const actual = getActualForWeek(week.week);
      
      if (actual) {
        // Use actual data when available
        totalRevenue += actual.revenue;
        totalCosts += actual.expenses;
        totalProfit += (actual.revenue - actual.expenses);
        totalFootTraffic += (actual.footTraffic || 0);
      } else {
        // Fall back to projections
        totalRevenue += week.totalRevenue;
        totalCosts += week.totalCosts;
        totalProfit += week.weeklyProfit;
        totalFootTraffic += week.footTraffic;
      }
    });

    // Calculate key metrics
    const profitMargin = totalRevenue > 0 ? (totalRevenue - totalCosts) / totalRevenue : 0;
    const breakEvenWeek = weeklyProjections.findIndex(w => w.cumulativeProfit > 0) + 1;

    // Calculate total setup costs
    const totalSetupCosts = costMetrics?.setupCosts?.reduce((sum, cost) => sum + cost.amount, 0) || 0;

    // Count high risks
    const highRisks = risks.filter(r => r.impact === 'High' && r.status !== 'Closed').length;

    // Calculate weekly recurring costs
    const weeklyEventCosts = costMetrics?.eventCosts?.reduce((sum, cost) => sum + cost.amount, 0) || 0;
    
    // Calculate staffing costs (both legacy and new role-based)
    let weeklyStaffingCosts = 0;
    if (costMetrics?.staffRoles && costMetrics.staffRoles.length > 0) {
      // Use new role-based staffing
      weeklyStaffingCosts = costMetrics.staffRoles.reduce((sum, role) => {
        const roleCount = role.count || 0;
        const costPerPerson = role.costPerPerson || 0;
        const eventsPerWeek = currentProduct.info.eventsPerWeek || 1;
        
        // Calculate based on full-time or per-event
        if (role.isFullTime) {
          return sum + (roleCount * costPerPerson);
        } else {
          return sum + (roleCount * costPerPerson * eventsPerWeek);
        }
      }, 0);
    } else {
      // Use legacy staffing
      weeklyStaffingCosts = (costMetrics?.additionalStaffingPerEvent || 0) * 
        (costMetrics?.staffingCostPerPerson || 0) * 
        (currentProduct.info.eventsPerWeek || 1);
    }
    
    // Calculate marketing costs (both legacy and new channel-based)
    let weeklyMarketingCosts = 0;
    if (costMetrics?.marketing?.channels && costMetrics.marketing.channels.length > 0) {
      // Use new channel-based marketing
      weeklyMarketingCosts = costMetrics.marketing.channels.reduce((sum, channel) => 
        sum + (channel.budget || 0), 0);
    } else {
      // Use legacy marketing
      weeklyMarketingCosts = costMetrics?.marketing?.type === 'weekly' 
        ? (costMetrics?.marketing?.weeklyBudget || 0)
        : ((costMetrics?.marketing?.campaignBudget || 0) / (costMetrics?.marketing?.campaignDurationWeeks || 12));
    }

    // Calculate total COGS
    const totalFbCogs = weeklyProjections.reduce((sum, week) => sum + (week.fbCogs || 0), 0);
    const totalMerchandiseCogs = weeklyProjections.reduce((sum, week) => sum + (week.merchandiseCogs || 0), 0);

    // Prepare cost breakdown data
    const costBreakdownData = [
      { name: 'Marketing', value: weeklyMarketingCosts * 12, color: COLORS.marketing },
      { name: 'Staffing', value: weeklyStaffingCosts * 12, color: COLORS.staffing },
      { name: 'Event Costs', value: weeklyEventCosts * 12, color: COLORS.event },
      { name: 'Setup Costs', value: totalSetupCosts, color: COLORS.setup },
    ];

    // Add COGS to cost breakdown if applicable
    if (currentProduct.info.type === 'Food & Beverage Products' && totalFbCogs > 0) {
      costBreakdownData.push({ name: 'F&B COGS', value: totalFbCogs, color: COLORS.fbCogs });
    }

    if (currentProduct.info.type === 'Merchandise Drops' && totalMerchandiseCogs > 0) {
      costBreakdownData.push({ name: 'Merch COGS', value: totalMerchandiseCogs, color: COLORS.merchCogs });
    }

    // Filter out zero values
    const filteredCostBreakdownData = costBreakdownData.filter(item => item.value > 0);
    
    // Create a default cost breakdown if no costs are defined
    const displayCostBreakdownData = filteredCostBreakdownData.length > 0 
      ? filteredCostBreakdownData 
      : [
          { name: 'No Cost Data', value: 100, color: '#CBD5E1' }, // A light gray color
        ];

    // Prepare weekly cost trend data separate from revenue data
    const weeklyCostData = weeklyProjections.map(week => {
      const actual = getActualForWeek(week.week);
      return {
        name: `Week ${week.week}`,
        projected: actual ? null : week.totalCosts,
        actual: actual ? actual.expenses : null,
        // Use different colors
        projectedColor: '#94A3B8', // Slate color for costs projection
        actualColor: '#EF4444'  // Red color for actual costs
      };
    });

    // Prepare marketing channel breakdown if channels exist
    const marketingChannelData = costMetrics?.marketing?.channels && costMetrics.marketing.channels.length > 0
      ? costMetrics.marketing.channels.map((channel, index) => ({
          name: channel.name || `Channel ${index + 1}`,
          value: (channel.budget || 0) * 12,
          weeklyBudget: channel.budget || 0,
          color: COLORS[Object.keys(COLORS)[index % Object.keys(COLORS).length] as keyof typeof COLORS],
          expectedROI: channel.expectedROI || 0,
          expectedReturn: ((channel.budget || 0) * 12) * ((channel.expectedROI || 0) / 100)
        }))
      : [];

    // Prepare staff role breakdown if roles exist
    const staffRoleData = costMetrics?.staffRoles && costMetrics.staffRoles.length > 0
      ? costMetrics.staffRoles.map((role, index) => {
          const eventsPerWeek = currentProduct.info.eventsPerWeek || 1;
          const roleCost = role.isFullTime 
            ? (role.count * role.costPerPerson) * 12
            : (role.count * role.costPerPerson * eventsPerWeek) * 12;
            
          return {
            name: role.role || `Role ${index + 1}`,
            value: roleCost,
            color: role.isFullTime ? COLORS.staffing : COLORS.marketing,
            isFullTime: role.isFullTime
          };
        })
      : [];

    // Update the revenue data to better differentiate between actuals and forecasts
    // and include profit data
    const revenueAndProfitData = weeklyProjections.map((week, index, array) => {
      const actual = getActualForWeek(week.week);
      
      // Calculate 3-week rolling average for revenue (if we have enough data)
      let rollingRevAvg = null;
      if (index >= 2) {
        const prevWeeks = array.slice(Math.max(0, index - 2), index + 1);
        const revSum = prevWeeks.reduce((sum, w) => {
          const weekActual = getActualForWeek(w.week);
          return sum + (weekActual ? weekActual.revenue : w.totalRevenue);
        }, 0);
        rollingRevAvg = revSum / prevWeeks.length;
      }
      
      return {
        name: `Week ${week.week}`,
        projectedRevenue: actual ? null : week.totalRevenue,
        actualRevenue: actual ? actual.revenue : null,
        projectedProfit: actual ? null : week.weeklyProfit,
        actualProfit: actual ? (actual.revenue - actual.expenses) : null,
        revenueTrend: rollingRevAvg,
        // Colors
        revenueColor: COLORS.forecast,
        actualColor: COLORS.actual,
        profitColor: '#3B82F6', // blue
        actualProfitColor: '#22C55E', // green
        hasActual: !!actual
      };
    });

    // Find the last week with actual data
    const lastActualWeekIndex = revenueAndProfitData.findIndex(data => !data.hasActual) - 1;
    
    // Calculate min and max profit values to ensure proper chart scaling
    let minProfit = 0;
    let maxProfit = 0;
    
    revenueAndProfitData.forEach(data => {
      if (data.actualProfit !== null && data.actualProfit < minProfit) {
        minProfit = data.actualProfit;
      }
      if (data.projectedProfit !== null && data.projectedProfit < minProfit) {
        minProfit = data.projectedProfit;
      }
      if (data.actualProfit !== null && data.actualProfit > maxProfit) {
        maxProfit = data.actualProfit;
      }
      if (data.projectedProfit !== null && data.projectedProfit > maxProfit) {
        maxProfit = data.projectedProfit;
      }
    });
    
    // Add padding to the min/max values
    minProfit = minProfit < 0 ? minProfit * 1.1 : minProfit;
    maxProfit = maxProfit * 1.1;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{currentProduct.info.name} Dashboard</h2>
          <Button variant="outline" onClick={() => setView('portfolio')}>
            View Portfolio Dashboard
          </Button>
        </div>
        
        {/* Add an explanation about how actuals affect projections */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-1">About Financial Projections</h3>
          <p className="text-xs text-blue-700">
            As actual performance data is recorded, it replaces the original forecasts for those weeks. 
            The financial metrics shown in this dashboard combine actual recorded data with projections for remaining weeks.
            Differences between actuals and original projections may indicate trends that affect future performance.
          </p>
        </div>
        
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">12-week forecast period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              {profitMargin >= 0.15 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercent(profitMargin)}</div>
              <p className="text-xs text-muted-foreground">
                {profitMargin >= 0.15 ? 'Above target' : 'Below target'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Break-even Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {breakEvenWeek > 0 && breakEvenWeek <= weeklyProjections.length 
                  ? `Week ${breakEvenWeek}` 
                  : 'After week 12'}
              </div>
              <p className="text-xs text-muted-foreground">Weeks until profitable</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risks</CardTitle>
              <AlertCircle className={`h-4 w-4 ${highRisks > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{highRisks}</div>
              <p className="text-xs text-muted-foreground">Unresolved high impact risks</p>
            </CardContent>
          </Card>
        </div>

        {/* Cost Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Structure</CardTitle>
            <CardDescription>Breakdown of cost categories and weekly spending trends</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Remove the Tabs component if there are no marketing channels or staff roles defined */}
            {marketingChannelData.length === 0 && staffRoleData.length === 0 ? (
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-medium mb-4">Cost Distribution</h4>
                  <div className="h-[300px]">
                    {displayCostBreakdownData.length === 1 && displayCostBreakdownData[0].name === 'No Cost Data' ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="text-center mb-4 text-gray-500">
                          <p className="mb-2">No cost data available</p>
                          <p className="text-sm">Add costs in the Forecast section to see distribution</p>
                        </div>
                        <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                          <DollarSign className="h-12 w-12 text-gray-300" />
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Navigate to the product page
                            if (currentProductId) {
                              window.location.href = `/product/${currentProductId}`;
                            }
                          }}
                        >
                          Set Up Costs
                        </Button>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={displayCostBreakdownData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry) => `${entry.name} (${formatPercent(entry.value / (totalCosts || 1))})`}
                          >
                            {displayCostBreakdownData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-4">Weekly Cost Trend</h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyCostData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis 
                          tickFormatter={(value) => value >= 1000 ? `$${value/1000}k` : `$${value}`}
                          label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [formatCurrency(value), name === 'projected' ? 'Projected Cost' : 'Actual Cost']}
                        />
                        <Legend />
                        <Line 
                          type="monotone"
                          dataKey="projected" 
                          name="Projected Cost" 
                          stroke="#94A3B8"
                          strokeWidth={2}
                          activeDot={{ r: 8 }}
                          connectNulls={true}
                        />
                        <Line 
                          type="monotone"
                          dataKey="actual" 
                          name="Actual Cost" 
                          stroke="#EF4444"
                          strokeWidth={3}
                          activeDot={{ r: 8 }}
                          connectNulls={true}
                        />
                        {/* Add reference line for the last actual week */}
                        {weeklyCostData.findIndex(d => d.actual !== null) >= 0 && (
                          <ReferenceLine 
                            x={weeklyCostData.filter(d => d.actual !== null).pop()?.name}
                            yAxisId="0"
                            stroke="#888"
                            strokeDasharray="3 3"
                            label={{ value: "Last Actual", position: "insideTopRight", fill: "#888", fontSize: 10 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Cost Breakdown</TabsTrigger>
                  {marketingChannelData.length > 0 && <TabsTrigger value="marketing">Marketing Channels</TabsTrigger>}
                  {staffRoleData.length > 0 && <TabsTrigger value="staffing">Staffing Structure</TabsTrigger>}
                </TabsList>
                
                <TabsContent value="overview">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-sm font-medium mb-4">Cost Distribution</h4>
                      <div className="h-[300px]">
                        {displayCostBreakdownData.length === 1 && displayCostBreakdownData[0].name === 'No Cost Data' ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="text-center mb-4 text-gray-500">
                              <p className="mb-2">No cost data available</p>
                              <p className="text-sm">Add costs in the Forecast section to see distribution</p>
                            </div>
                            <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                              <DollarSign className="h-12 w-12 text-gray-300" />
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Navigate to the product page
                                if (currentProductId) {
                                  window.location.href = `/product/${currentProductId}`;
                                }
                              }}
                            >
                              Set Up Costs
                            </Button>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={displayCostBreakdownData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={(entry) => `${entry.name} (${formatPercent(entry.value / (totalCosts || 1))})`}
                              >
                                {displayCostBreakdownData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: number) => formatCurrency(value)}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-4">Weekly Cost Trend</h4>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={weeklyCostData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis 
                              tickFormatter={(value) => value >= 1000 ? `$${value/1000}k` : `$${value}`}
                              label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                            />
                            <Tooltip 
                              formatter={(value: number, name: string) => [formatCurrency(value), name === 'projected' ? 'Projected Cost' : 'Actual Cost']}
                            />
                            <Legend />
                            <Line 
                              type="monotone"
                              dataKey="projected" 
                              name="Projected Cost" 
                              stroke="#94A3B8"
                              strokeWidth={2}
                              activeDot={{ r: 8 }}
                              connectNulls={true}
                            />
                            <Line 
                              type="monotone"
                              dataKey="actual" 
                              name="Actual Cost" 
                              stroke="#EF4444"
                              strokeWidth={3}
                              activeDot={{ r: 8 }}
                              connectNulls={true}
                            />
                            {/* Add reference line for the last actual week */}
                            {weeklyCostData.findIndex(d => d.actual !== null) >= 0 && (
                              <ReferenceLine 
                                x={weeklyCostData.filter(d => d.actual !== null).pop()?.name}
                                yAxisId="0"
                                stroke="#888"
                                strokeDasharray="3 3"
                                label={{ value: "Last Actual", position: "insideTopRight", fill: "#888", fontSize: 10 }}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {marketingChannelData.length > 0 && (
                  <TabsContent value="marketing">
                    <div className="space-y-6">
                      <h4 className="text-sm font-medium mb-4">Marketing Channel Distribution</h4>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={marketingChannelData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={(entry) => `${entry.name}`}
                              >
                                {marketingChannelData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: number) => formatCurrency(value)}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-4">ROI by Channel</h4>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={marketingChannelData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 'dataMax']} />
                                <YAxis dataKey="name" type="category" />
                                <Tooltip
                                  formatter={(value: number) => [`${value}%`, 'Expected ROI']}
                                />
                                <Legend />
                                <Bar dataKey="expectedROI" name="Expected ROI (%)" fill={COLORS.profit} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Marketing Performance Table */}
                      <div className="mt-8">
                        <h4 className="text-sm font-medium mb-4">Marketing Performance</h4>
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-4 py-2 text-left">Channel</th>
                                <th className="px-4 py-2 text-right">Weekly Budget</th>
                                <th className="px-4 py-2 text-right">Annual Budget</th>
                                <th className="px-4 py-2 text-right">Expected ROI</th>
                                <th className="px-4 py-2 text-right">Projected Return</th>
                              </tr>
                            </thead>
                            <tbody>
                              {marketingChannelData.map((channel, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                                  <td className="px-4 py-2 font-medium">{channel.name}</td>
                                  <td className="px-4 py-2 text-right">{formatCurrency(channel.weeklyBudget)}</td>
                                  <td className="px-4 py-2 text-right">{formatCurrency(channel.value)}</td>
                                  <td className="px-4 py-2 text-right">{channel.expectedROI}%</td>
                                  <td className="px-4 py-2 text-right">{formatCurrency(channel.expectedReturn)}</td>
                                </tr>
                              ))}
                              <tr className="bg-muted/50 font-medium">
                                <td className="px-4 py-2">Total</td>
                                <td className="px-4 py-2 text-right">
                                  {formatCurrency(marketingChannelData.reduce((sum, channel) => sum + channel.weeklyBudget, 0))}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {formatCurrency(marketingChannelData.reduce((sum, channel) => sum + channel.value, 0))}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {marketingChannelData.length > 0 
                                    ? (marketingChannelData.reduce((sum, channel) => sum + channel.expectedROI, 0) / marketingChannelData.length).toFixed(2)
                                    : "0.00"}%
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {formatCurrency(marketingChannelData.reduce((sum, channel) => sum + channel.expectedReturn, 0))}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}

                {staffRoleData.length > 0 && (
                  <TabsContent value="staffing">
                    <div className="space-y-6">
                      <h4 className="text-sm font-medium mb-4">Staffing Structure</h4>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={staffRoleData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={(entry) => `${entry.name}`}
                              >
                                {staffRoleData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: number, name: string, props: any) => [
                                  formatCurrency(value), 
                                  `${name} (${props.payload.isFullTime ? 'Full-time' : 'Per-event'})`
                                ]}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-4">Staff Costs by Type</h4>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={staffRoleData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" />
                                <Tooltip
                                  formatter={(value: number) => [formatCurrency(value), 'Annual Cost']}
                                />
                                <Legend />
                                <Bar
                                  dataKey="value"
                                  name="Annual Cost"
                                  fill={COLORS.staffing}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Revenue & Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Profit Trend</CardTitle>
            <CardDescription>Performance versus projections over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                  <span className="text-xs">Projected Revenue</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                  <span className="text-xs">Actual Revenue</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: '#F59E0B' }}></div>
                  <span className="text-xs">Revenue Trend (3-week avg)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: '#3B82F6' }}></div>
                  <span className="text-xs">Projected Profit</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: '#22C55E', border: '1px dashed #16A34A' }}></div>
                  <span className="text-xs">Actual Profit</span>
                </div>
              </div>
              {lastActualWeekIndex >= 0 && (
                <div className="text-xs text-gray-500">
                  Actuals available for weeks 1-{lastActualWeekIndex + 1}
                </div>
              )}
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueAndProfitData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    tickFormatter={(value) => value >= 1000 ? `$${value/1000}k` : `$${value}`}
                    label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tickFormatter={(value) => value >= 1000 ? `$${value/1000}k` : `$${value}`}
                    label={{ value: 'Profit ($)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                    domain={[minProfit, maxProfit]}
                    allowDataOverflow={false}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      if (value === null) return ['-', name];
                      const formattedValue = formatCurrency(value);
                      let displayName = '';
                      
                      switch(name) {
                        case 'projectedRevenue':
                          displayName = 'Projected Revenue';
                          break;
                        case 'actualRevenue':
                          displayName = 'Actual Revenue';
                          break;
                        case 'projectedProfit':
                          displayName = 'Projected Profit';
                          break;
                        case 'actualProfit':
                          displayName = 'Actual Profit';
                          break;
                        case 'revenueTrend':
                          displayName = '3-Week Revenue Trend';
                          break;
                        default:
                          displayName = name;
                      }
                      
                      return [formattedValue, displayName];
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend />
                  {/* Bars for Revenue */}
                  <Bar 
                    yAxisId="left"
                    dataKey="projectedRevenue" 
                    name="Projected Revenue" 
                    fill="#93C5FD" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    connectNulls={true}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="actualRevenue" 
                    name="Actual Revenue" 
                    fill="#22C55E" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    connectNulls={true}
                  />
                  
                  {/* Revenue Trend Line */}
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenueTrend" 
                    name="Revenue Trend" 
                    stroke="#F59E0B"  // amber
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                  
                  {/* Lines for Profit */}
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="projectedProfit" 
                    name="Projected Profit" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                    connectNulls={true}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="actualProfit" 
                    name="Actual Profit" 
                    stroke="#22C55E" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 5, fill: '#22C55E', stroke: '#16A34A', strokeWidth: 1 }}
                    activeDot={{ r: 8 }}
                    connectNulls={true}
                  />
                  
                  {/* Add reference line between actuals and projections */}
                  {lastActualWeekIndex >= 0 && (
                    <ReferenceLine
                      x={revenueAndProfitData[lastActualWeekIndex].name}
                      yAxisId="left" 
                      stroke="#888"
                      strokeDasharray="3 3"
                      label={{
                        value: "Last Actual",
                        position: "insideTopRight",
                        fill: "#888",
                        fontSize: 10
                      }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Add a note about actual data */}
        <p className="text-sm text-gray-500 mb-4">
          Financial overview combining projections with actual data. 
          <span className="text-green-600 ml-2">Green bars and indicators</span> show actual revenue, while 
          <span className="text-blue-500 ml-2">blue lines</span> show projected profit. The 
          <span className="text-amber-500 ml-2">amber trend line</span> displays a 3-week rolling average of revenue to highlight underlying patterns.
        </p>
      </div>
    );
  }

  // PORTFOLIO DASHBOARD
  // Calculate portfolio-level metrics
  const portfolioData = products.map(product => {
    const weeklyProjections = product.weeklyProjections || [];
    const totalRevenue = weeklyProjections.reduce((sum, week) => sum + week.totalRevenue, 0);
    const totalCosts = weeklyProjections.reduce((sum, week) => sum + week.totalCosts, 0);
    const profit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? profit / totalRevenue : 0;
    const breakEvenWeek = weeklyProjections.findIndex(w => w.cumulativeProfit > 0) + 1;
    
    return {
      id: product.info.id,
      name: product.info.name,
      type: product.info.type,
      revenue: totalRevenue,
      costs: totalCosts,
      profit: profit,
      profitMargin: profitMargin,
      breakEvenWeek: breakEvenWeek > 0 ? breakEvenWeek : -1,
      risks: product.risks?.length || 0,
      highRisks: product.risks?.filter(r => r.impact === 'High' && r.status !== 'Closed').length || 0
    };
  });

  // Total portfolio metrics
  const totalPortfolioRevenue = portfolioData.reduce((sum, product) => sum + product.revenue, 0);
  const totalPortfolioCosts = portfolioData.reduce((sum, product) => sum + product.costs, 0);
  const totalPortfolioProfit = totalPortfolioRevenue - totalPortfolioCosts;
  const portfolioProfitMargin = totalPortfolioRevenue > 0 ? totalPortfolioProfit / totalPortfolioRevenue : 0;
  
  // Product type distribution
  const productTypeData = Object.entries(
    portfolioData.reduce((acc, product) => {
      acc[product.type] = (acc[product.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({
    name: type,
    value: count,
    color: PRODUCT_TYPE_COLORS[type as keyof typeof PRODUCT_TYPE_COLORS] || '#8884d8'
  }));
  
  // Revenue by product type
  const revenueByType = Object.entries(
    portfolioData.reduce((acc, product) => {
      acc[product.type] = (acc[product.type] || 0) + product.revenue;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, revenue]) => ({
    name: type,
    value: revenue,
    color: PRODUCT_TYPE_COLORS[type as keyof typeof PRODUCT_TYPE_COLORS] || '#8884d8'
  }));
  
  // Best and worst performers
  const sortedByProfit = [...portfolioData].sort((a, b) => b.profit - a.profit);
  const bestPerformers = sortedByProfit.slice(0, 3);
  const worstPerformers = [...sortedByProfit].reverse().slice(0, 3);
  
  // Comparison chart data
  const productComparisonData = [
    { name: 'Revenue', ...Object.fromEntries(portfolioData.map(p => [p.name, p.revenue])) },
    { name: 'Costs', ...Object.fromEntries(portfolioData.map(p => [p.name, p.costs])) },
    { name: 'Profit', ...Object.fromEntries(portfolioData.map(p => [p.name, p.profit])) }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Portfolio Dashboard</h2>
        {currentProduct && (
          <Button variant="outline" onClick={() => setView('current')}>
            View {currentProduct.info.name} Dashboard
          </Button>
        )}
      </div>
      
      {/* Portfolio Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Products</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              {products.length > 1 ? 'Active products in portfolio' : 'Active product in portfolio'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPortfolioRevenue)}</div>
            <p className="text-xs text-muted-foreground">Combined 12-week forecast</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Profit</CardTitle>
            {totalPortfolioProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPortfolioProfit)}</div>
            <p className="text-xs text-muted-foreground">
              Profit margin: {formatPercent(portfolioProfitMargin)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Products</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolioData.filter(p => p.highRisks > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Products with high impact risks
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Product Type Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {productTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Product Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                  >
                    {revenueByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Products</TabsTrigger>
              <TabsTrigger value="best">Best Performers</TabsTrigger>
              <TabsTrigger value="worst">Improvement Needed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    {portfolioData.map((product, index) => (
                      <Bar key={product.id} dataKey={product.name} fill={COLORS[Object.keys(COLORS)[index % Object.keys(COLORS).length] as keyof typeof COLORS]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="best">
              <div className="space-y-4">
                {bestPerformers.length > 0 ? (
                  bestPerformers.map(product => (
                    <Card key={product.id} className="overflow-hidden">
                      <div className={`h-2 ${product.profit > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">{product.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">{formatCurrency(product.profit)}</p>
                            <p className="text-sm text-muted-foreground">Profit Margin: {formatPercent(product.profitMargin)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-center py-8 text-gray-500">No product data available.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="worst">
              <div className="space-y-4">
                {worstPerformers.length > 0 ? (
                  worstPerformers.map(product => (
                    <Card key={product.id} className="overflow-hidden">
                      <div className={`h-2 ${product.profit < 0 ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">{product.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">{formatCurrency(product.profit)}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.profit < 0 
                                ? `Loss Margin: ${formatPercent(Math.abs(product.profitMargin))}` 
                                : `Profit Margin: ${formatPercent(product.profitMargin)}`}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-center py-8 text-gray-500">No product data available.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Risk Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Risk Overview</CardTitle>
          <CardDescription>Risk distribution across products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={portfolioData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                <Radar name="High Risks" dataKey="highRisks" stroke="#EA4335" fill="#EA4335" fillOpacity={0.6} />
                <Radar name="Total Risks" dataKey="risks" stroke="#4285F4" fill="#4285F4" fillOpacity={0.2} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}