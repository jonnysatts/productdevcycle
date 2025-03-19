import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, 
  AreaChart, Area, ReferenceLine, ScatterChart, Scatter
} from 'recharts';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { 
  DollarSign, PieChart as PieChartIcon, BarChart as LayoutIcon, Users, 
  TrendingUp, AlertCircle,
  Calendar, ArrowUpDown, Activity
} from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency, formatPercent, formatNumber } from '../lib/utils';
import type { MarketingChannelItem, WeeklyProjection, ActualMetrics } from '../types';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

// Define channel performance type since it might not be exported from types
interface ChannelPerformance {
  channelId: string;
  spend?: number;
  revenue?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
}

// Colors for the charts
const COLORS: Record<string, string> = {
  revenue: '#22c55e',
  expense: '#ef4444',
  profit: '#3b82f6',
  social: '#8b5cf6', 
  search: '#ec4899',
  email: '#f59e0b',
  content: '#10b981',
  referral: '#6366f1',
  print: '#64748b',
  event: '#d97706',
  influencer: '#9333ea',
  other: '#94a3b8',
  healthy: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

// Industry benchmark ranges
const MARKETING_RATIO_BENCHMARKS = {
  low: 10, // below 10% is considered low investment
  healthy: 15, // 10-15% is considered healthy
  high: 20, // above 20% is considered high
};

// Add new benchmark data for channel performance
const CHANNEL_BENCHMARKS = {
  clickThroughRate: {
    low: 1.5,    // below 1.5% is considered low
    average: 2.5, // 1.5-3.5% is considered average
    high: 3.5     // above 3.5% is considered high
  },
  conversionRate: {
    low: 2,      // below 2% is considered low
    average: 4,   // 2-6% is considered average
    high: 6       // above 6% is considered high
  },
  costPerClick: {
    social: { low: 0.70, high: 1.50 },
    search: { low: 1.00, high: 3.00 },
    email: { low: 0.05, high: 0.30 },
    content: { low: 0.50, high: 1.20 },
    influencer: { low: 2.00, high: 5.00 }
  }
};

// Define types for our component state
interface ChannelPerformanceData {
  id: string;
  name: string;
  budget: number;
  allocation: number;
  totalSpend: number;
  totalRevenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  color: string;
}

interface MarketingRatioData {
  week: string;
  marketingCost: number;
  revenue: number;
  ratio: number;
  hasActual: boolean;
  status: 'low' | 'healthy' | 'high';
}

interface MarketingSummaryData {
  totalBudget: number;
  totalSpend: number;
  totalProjectedRevenue: number;
  totalActualRevenue: number;
  ratio: number;
  status: 'low' | 'healthy' | 'high';
}

interface BudgetAllocationData {
  name: string;
  value: number;
  allocation: number;
}

export default function MarketingAnalytics() {
  const { products, currentProductId } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'last4weeks' | 'last3months'>('all');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [channelComparisonMetric, setChannelComparisonMetric] = useState<'ratio' | 'spend' | 'revenue' | 'ctr' | 'conversion'>('ratio');

  // Get current product
  const currentProduct = useMemo(() => 
    products.find(p => p.info.id === currentProductId), 
    [products, currentProductId]
  );

  if (!currentProduct) {
    return (
      <div className="text-center py-8 text-gray-500">
        No product selected or product not found.
      </div>
    );
  }

  // Extract marketing channels and actuals from the current product
  const { costMetrics, actualMetrics = [], weeklyProjections = [] } = currentProduct;
  const marketingChannels = costMetrics?.marketing?.channels || [];

  // Filter actuals based on selected timeframe
  const filteredActuals = useMemo(() => {
    const sortedActuals = [...actualMetrics].sort((a, b) => a.week - b.week);
    
    switch (selectedTimeframe) {
      case 'last4weeks':
        return sortedActuals.slice(-4);
      case 'last3months':
        return sortedActuals.slice(-12);
      default:
        return sortedActuals;
    }
  }, [actualMetrics, selectedTimeframe]);

  // Calculate channel performance metrics
  const channelPerformance = useMemo(() => {
    // Start with channel configuration
    const channelsMap = new Map<string, ChannelPerformanceData>();
    
    // Initialize with base data from costMetrics
    marketingChannels.forEach((channel: MarketingChannelItem) => {
      channelsMap.set(channel.id, {
        id: channel.id,
        name: channel.name || 'Unnamed Channel',
        budget: channel.budget || 0,
        allocation: channel.allocation || 0,
        totalSpend: 0,
        totalRevenue: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        color: COLORS[Object.keys(COLORS)[Math.floor(Math.random() * Object.keys(COLORS).length)]]
      });
    });
    
    // Aggregate performance from actuals
    filteredActuals.forEach((actual: ActualMetrics) => {
      if (actual.channelPerformance) {
        actual.channelPerformance.forEach((perf: ChannelPerformance) => {
          if (channelsMap.has(perf.channelId)) {
            const channel = channelsMap.get(perf.channelId);
            if (channel) {
              channel.totalSpend += perf.spend || 0;
              channel.totalRevenue += perf.revenue || 0;
              channel.impressions += perf.impressions || 0;
              channel.clicks += perf.clicks || 0;
              channel.conversions += perf.conversions || 0;
              
              channelsMap.set(perf.channelId, channel);
            }
          }
        });
      }
    });
    
    return Array.from(channelsMap.values());
  }, [marketingChannels, filteredActuals]);

  // Calculate marketing-to-revenue ratio data by week
  const marketingToRevenueData = useMemo(() => {
    // Combine actuals and projections
    const combined = [...weeklyProjections];
    
    // Map actuals
    const weeklyRatios = combined.map(week => {
      // Check if we have actual data for this week
      const actual = actualMetrics.find((a: ActualMetrics) => a.week === week.week);
      
      // Calculate metrics based on actuals or projections
      const revenue = actual ? (actual.totalRevenue || actual.revenue || 0) : week.totalRevenue;
      const marketingCost = actual ? (actual.marketingCost || 0) : week.marketingCosts;
      
      // Calculate ratio (as percentage)
      const ratio = revenue > 0 ? (marketingCost / revenue) * 100 : 0;
      
      return {
        week: `Week ${week.week}`,
        marketingCost,
        revenue,
        ratio,
        hasActual: !!actual,
        // Add status based on benchmark ranges
        status: ratio < MARKETING_RATIO_BENCHMARKS.low 
          ? 'low' 
          : ratio > MARKETING_RATIO_BENCHMARKS.high 
            ? 'high' 
            : 'healthy'
      } as MarketingRatioData;
    });
    
    return weeklyRatios;
  }, [weeklyProjections, actualMetrics]);

  // Calculate total marketing and revenue metrics
  const marketingSummary = useMemo(() => {
    // Get total budget - check both simple and channel-based methods
    let totalBudget = 0;
    
    if (costMetrics?.marketing) {
      if (costMetrics.marketing.allocationMode === 'simple') {
        // Simple budget mode - use weeklyBudget or calculate from campaign
        if (costMetrics.marketing.type === 'weekly') {
          totalBudget = (costMetrics.marketing.weeklyBudget || 0) * (currentProduct.info.forecastPeriod || 12);
        } else {
          // Campaign budget
          totalBudget = costMetrics.marketing.campaignBudget || 0;
        }
      } else {
        // Channel-based - sum up all channel budgets
        totalBudget = marketingChannels.reduce((sum: number, ch: MarketingChannelItem) => 
          sum + (ch.budget || 0), 0) * (currentProduct.info.forecastPeriod || 12);
      }
    }
    
    const totalSpend = channelPerformance.reduce((sum: number, ch: ChannelPerformanceData) => sum + ch.totalSpend, 0);
    
    // Total revenue from projections
    const totalProjectedRevenue = weeklyProjections.reduce((sum: number, week: WeeklyProjection) => sum + week.totalRevenue, 0);
    
    // Total actual revenue so far
    const totalActualRevenue = filteredActuals.reduce((sum: number, actual: ActualMetrics) => 
      sum + (actual.totalRevenue || actual.revenue || 0), 0);
    
    // Calculate average marketing-to-revenue ratio
    const ratio = totalProjectedRevenue > 0 
      ? (totalBudget / totalProjectedRevenue) * 100 
      : 0;
    
    // Determine if ratio is within healthy range
    const status = ratio < MARKETING_RATIO_BENCHMARKS.low 
      ? 'low' 
      : ratio > MARKETING_RATIO_BENCHMARKS.high 
        ? 'high' 
        : 'healthy';
    
    return {
      totalBudget,
      totalSpend,
      totalProjectedRevenue,
      totalActualRevenue,
      ratio,
      status
    } as MarketingSummaryData;
  }, [marketingChannels, channelPerformance, weeklyProjections, filteredActuals, currentProduct.info.forecastPeriod, costMetrics?.marketing]);

  // Also update budget allocation data to show data from simple budget if needed
  const budgetAllocationData = useMemo(() => {
    if (costMetrics?.marketing?.allocationMode === 'channels' && marketingChannels.length > 0) {
      // Use channel data if available
      return marketingChannels.map((channel: MarketingChannelItem) => ({
        name: channel.name || 'Unnamed',
        value: channel.budget || 0,
        allocation: channel.allocation || 0,
      })) as BudgetAllocationData[];
    } else if (costMetrics?.marketing) {
      // Create a single allocation item for simple budget
      const budgetName = costMetrics.marketing.type === 'weekly' ? 'Weekly Budget' : 'Campaign Budget';
      const budgetValue = costMetrics.marketing.type === 'weekly' 
        ? (costMetrics.marketing.weeklyBudget || 0)
        : (costMetrics.marketing.campaignBudget || 0);
      
      return [{
        name: budgetName,
        value: budgetValue,
        allocation: 100,
      }] as BudgetAllocationData[];
    }
    
    return [] as BudgetAllocationData[];
  }, [marketingChannels, costMetrics?.marketing]);

  // Calculate channel efficiency metrics
  const channelEfficiency = useMemo(() => {
    return channelPerformance.map((channel: ChannelPerformanceData) => {
      const clicks = channel.clicks || 0;
      const impressions = channel.impressions || 0;
      const conversions = channel.conversions || 0;
      
      // Calculate metrics
      const clickThroughRate = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const costPerClick = clicks > 0 ? channel.totalSpend / clicks : 0;
      const costPerImpression = impressions > 0 ? channel.totalSpend / impressions * 1000 : 0; // CPM
      const costPerConversion = conversions > 0 ? channel.totalSpend / conversions : 0;
      
      // Determine performance status based on benchmarks
      const ctrStatus = 
        clickThroughRate < CHANNEL_BENCHMARKS.clickThroughRate.low ? 'low' :
        clickThroughRate > CHANNEL_BENCHMARKS.clickThroughRate.high ? 'high' : 'average';
      
      const conversionStatus = 
        conversionRate < CHANNEL_BENCHMARKS.conversionRate.low ? 'low' :
        conversionRate > CHANNEL_BENCHMARKS.conversionRate.high ? 'high' : 'average';
        
      // Get channel type for CPC benchmarks (default to 'search' if not found)
      const channelType = channel.id.toLowerCase();
      const cpcBenchmark = Object.keys(CHANNEL_BENCHMARKS.costPerClick).includes(channelType) 
        ? CHANNEL_BENCHMARKS.costPerClick[channelType as keyof typeof CHANNEL_BENCHMARKS.costPerClick]
        : CHANNEL_BENCHMARKS.costPerClick.search;
      
      const cpcStatus = 
        costPerClick < cpcBenchmark.low ? 'low' :
        costPerClick > cpcBenchmark.high ? 'high' : 'average';
      
      return {
        ...channel,
        clickThroughRate,
        conversionRate,
        costPerClick,
        costPerImpression,
        costPerConversion,
        ctrStatus,
        conversionStatus,
        cpcStatus
      };
    });
  }, [channelPerformance]);

  // Get selected channels for comparison
  const selectedChannelData = useMemo(() => {
    if (selectedChannels.length === 0) {
      // Default to top 5 channels by spend
      const topChannels = [...channelEfficiency]
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 5)
        .map(c => c.id);
      
      return channelEfficiency.filter(c => topChannels.includes(c.id));
    }
    
    return channelEfficiency.filter(c => selectedChannels.includes(c.id));
  }, [channelEfficiency, selectedChannels]);

  // Prepare comparison data for selected metric
  const channelComparisonData = useMemo(() => {
    // Map metric to display properties
    const metricProps = {
      ratio: { 
        dataKey: 'ratio', 
        name: 'Marketing/Revenue Ratio (%)', 
        formatter: (value: number) => `${value.toFixed(1)}%`,
        color: COLORS.profit
      },
      spend: { 
        dataKey: 'totalSpend', 
        name: 'Total Spend', 
        formatter: formatCurrency,
        color: COLORS.expense
      },
      revenue: { 
        dataKey: 'totalRevenue', 
        name: 'Revenue Generated', 
        formatter: formatCurrency,
        color: COLORS.revenue
      },
      ctr: { 
        dataKey: 'clickThroughRate', 
        name: 'Click-Through Rate (%)', 
        formatter: (value: number) => `${value.toFixed(2)}%`,
        color: COLORS.social
      },
      conversion: { 
        dataKey: 'conversionRate', 
        name: 'Conversion Rate (%)', 
        formatter: (value: number) => `${value.toFixed(2)}%`,
        color: COLORS.referral
      }
    };
    
    // Get properties for selected metric
    const { dataKey, name, formatter, color } = metricProps[channelComparisonMetric as keyof typeof metricProps];
    
    // Return prepared data
    return {
      data: selectedChannelData.map(channel => {
        // Calculate ratio if needed
        const ratio = channel.totalRevenue > 0 
          ? (channel.totalSpend / channel.totalRevenue) * 100 
          : 0;
          
        return {
          name: channel.name,
          // Use the right metric based on selection
          value: channelComparisonMetric === 'ratio' ? ratio : channel[dataKey as keyof typeof channel] || 0,
          color: channel.color
        };
      }).sort((a: {value: number}, b: {value: number}) => b.value - a.value), // Sort by value descending
      name,
      formatter,
      color
    };
  }, [selectedChannelData, channelComparisonMetric]);

  // Render main dashboard
  const renderDashboardTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Marketing Budget Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Marketing Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(marketingSummary.totalBudget)}</div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(marketingSummary.totalBudget / (currentProduct.info.forecastPeriod || 12))} per week
            </p>
          </CardContent>
        </Card>
        
        {/* Marketing-to-Revenue Ratio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Marketing-to-Revenue Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold">{marketingSummary.ratio.toFixed(1)}%</div>
              <span className={`mb-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                marketingSummary.status === 'healthy' ? 'bg-green-100 text-green-800' : 
                marketingSummary.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {marketingSummary.status === 'healthy' ? 'Optimal' : 
                 marketingSummary.status === 'low' ? 'Underinvesting' : 
                 'High Investment'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Industry benchmark: 10-15%
            </p>
          </CardContent>
        </Card>
        
        {/* Projected Revenue Impact */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Projected Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(marketingSummary.totalProjectedRevenue)}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(marketingSummary.totalActualRevenue)} actual revenue so far
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Marketing-to-Revenue Ratio Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing-to-Revenue Ratio Over Time</CardTitle>
          <CardDescription>
            Track how your marketing spend as a percentage of revenue changes over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={marketingToRevenueData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis 
                  label={{ value: 'Marketing/Revenue (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 30]}
                />
                <Tooltip formatter={(value: any) => [`${value.toFixed(2)}%`, 'Marketing/Revenue']} />
                <Legend />
                
                {/* Benchmark lines */}
                <ReferenceLine y={MARKETING_RATIO_BENCHMARKS.low} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Min Recommended (10%)', position: 'right' }} />
                <ReferenceLine y={MARKETING_RATIO_BENCHMARKS.high} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Max Recommended (20%)', position: 'right' }} />
                
                <Area 
                  type="monotone" 
                  dataKey="ratio" 
                  name="Marketing/Revenue Ratio" 
                  fill={COLORS.profit} 
                  fillOpacity={0.3}
                  stroke={COLORS.profit}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Marketing Channel Allocation */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Budget Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget Allocation</CardTitle>
            <CardDescription>
              How your marketing budget is distributed across channels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetAllocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, allocation }: { name: string, allocation: number }) => `${name}: ${allocation}%`}
                  >
                    {budgetAllocationData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={Object.values(COLORS)[index % Object.values(COLORS).length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [formatCurrency(value), 'Budget']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Budget vs Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget vs Revenue</CardTitle>
            <CardDescription>
              Visualize how marketing investment impacts revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={channelPerformance}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [formatCurrency(value), '']} />
                  <Legend />
                  <Bar dataKey="totalSpend" name="Marketing Investment" fill={COLORS.expense} />
                  <Bar dataKey="totalRevenue" name="Revenue Generated" fill={COLORS.revenue} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Channel Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Weekly Budget</TableHead>
                  <TableHead className="text-right">Budget Allocation</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">Revenue Generated</TableHead>
                  <TableHead className="text-right">Marketing/Revenue Ratio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelPerformance.map((channel: ChannelPerformanceData) => {
                  const ratio = channel.totalRevenue > 0 
                    ? (channel.totalSpend / channel.totalRevenue) * 100 
                    : 0;
                  
                  const status = ratio < MARKETING_RATIO_BENCHMARKS.low 
                    ? 'low' 
                    : ratio > MARKETING_RATIO_BENCHMARKS.high 
                      ? 'high' 
                      : 'healthy';
                  
                  return (
                    <TableRow key={channel.id}>
                      <TableCell className="font-medium">{channel.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(channel.budget)}</TableCell>
                      <TableCell className="text-right">{channel.allocation || 0}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(channel.totalSpend)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(channel.totalRevenue)}</TableCell>
                      <TableCell className="text-right">
                        <span className={
                          status === 'healthy' ? 'text-green-600' : 
                          status === 'low' ? 'text-yellow-600' : 
                          'text-red-600'
                        }>
                          {ratio.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render channel analysis tab
  const renderChannelAnalysisTab = () => (
    <div className="space-y-6">
      {/* Channel Selection and Comparison Controls */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <Card className="w-full md:w-2/3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Channel Comparison</CardTitle>
            <CardDescription>
              Select channels and metrics to compare performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div>
                <Label htmlFor="comparison-metric">Comparison Metric:</Label>
                <Select 
                  value={channelComparisonMetric} 
                  onValueChange={(value) => setChannelComparisonMetric(value as any)}
                >
                  <SelectTrigger className="w-full md:w-[240px] mt-1">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ratio">Marketing/Revenue Ratio</SelectItem>
                    <SelectItem value="spend">Total Marketing Spend</SelectItem>
                    <SelectItem value="revenue">Revenue Generated</SelectItem>
                    <SelectItem value="ctr">Click-Through Rate</SelectItem>
                    <SelectItem value="conversion">Conversion Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Channels to Compare:</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {channelEfficiency.map(channel => (
                    <Button
                      key={channel.id}
                      variant={selectedChannels.includes(channel.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedChannels(prev => 
                          prev.includes(channel.id) 
                            ? prev.filter(id => id !== channel.id)
                            : [...prev, channel.id]
                        );
                      }}
                      className="h-8"
                    >
                      {channel.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-full md:w-1/3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Channel Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p>
                <span className="font-semibold">Top Channel:</span>{' '}
                {channelEfficiency.length > 0 ? 
                  channelEfficiency.sort((a, b) => b.totalRevenue - a.totalRevenue)[0].name : 
                  'None'
                }
              </p>
              <p>
                <span className="font-semibold">Most Efficient:</span>{' '}
                {channelEfficiency.length > 0 ? 
                  channelEfficiency.sort((a, b) => (a.totalSpend / a.totalRevenue) - (b.totalSpend / b.totalRevenue))[0].name : 
                  'None'
                }
              </p>
              <p>
                <span className="font-semibold">Highest CTR:</span>{' '}
                {channelEfficiency.length > 0 ? 
                  channelEfficiency.sort((a, b) => b.clickThroughRate - a.clickThroughRate)[0].name : 
                  'None'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Channel Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance Comparison</CardTitle>
          <CardDescription>
            Compare {channelComparisonData.name} across selected marketing channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={channelComparisonData.data}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70} 
                />
                <YAxis />
                <Tooltip formatter={(value: any) => [channelComparisonData.formatter(value), channelComparisonData.name]} />
                <Legend />
                <Bar 
                  dataKey="value" 
                  name={channelComparisonData.name} 
                  fill={channelComparisonData.color}
                >
                  {channelComparisonData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Channel Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Efficiency Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Efficiency Matrix</CardTitle>
            <CardDescription>
              Click-through rate vs. conversion rate for each channel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="clickThroughRate" 
                    name="Click-Through Rate" 
                    unit="%" 
                    domain={[0, 'dataMax + 1']}
                    label={{ value: 'Click-Through Rate (%)', position: 'bottom', offset: 0 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="conversionRate" 
                    name="Conversion Rate" 
                    unit="%" 
                    domain={[0, 'dataMax + 2']}
                    label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value.toFixed(2)}%`, '']}
                    labelFormatter={(value: any) => ``}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 border rounded shadow-sm">
                            <p className="font-semibold">{data.name}</p>
                            <p>CTR: {data.clickThroughRate.toFixed(2)}%</p>
                            <p>Conversion: {data.conversionRate.toFixed(2)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  
                  {/* Add reference lines for benchmark values */}
                  <ReferenceLine 
                    x={CHANNEL_BENCHMARKS.clickThroughRate.average} 
                    stroke="#f59e0b" 
                    strokeDasharray="3 3" 
                    label={{ value: 'Avg CTR', position: 'top' }} 
                  />
                  <ReferenceLine 
                    y={CHANNEL_BENCHMARKS.conversionRate.average} 
                    stroke="#f59e0b" 
                    strokeDasharray="3 3" 
                    label={{ value: 'Avg CVR', position: 'right' }} 
                  />
                  
                  {selectedChannelData.map((channel, index) => (
                    <Line
                      key={channel.id}
                      type="monotone"
                      data={[channel]}
                      name={channel.name}
                      dataKey="conversionRate"
                      stroke={channel.color}
                      activeDot={{ r: 8 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Cost Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Efficiency Metrics</CardTitle>
            <CardDescription>
              Cost per click and cost per conversion by channel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={selectedChannelData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), '']}
                  />
                  <Legend verticalAlign="top" />
                  <Bar 
                    dataKey="costPerClick" 
                    name="Cost per Click" 
                    fill={COLORS.social} 
                  />
                  <Bar 
                    dataKey="costPerConversion" 
                    name="Cost per Conversion" 
                    fill={COLORS.referral} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Channel Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance Details</CardTitle>
          <CardDescription>
            Comprehensive metrics for each marketing channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Conversion Rate</TableHead>
                  <TableHead className="text-right">Cost per Click</TableHead>
                  <TableHead className="text-right">Cost per Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelEfficiency.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(channel.budget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(channel.totalSpend)}</TableCell>
                    <TableCell className="text-right">{formatNumber(channel.impressions)}</TableCell>
                    <TableCell className="text-right">
                      <span className={
                        channel.ctrStatus === 'high' ? 'text-green-600' : 
                        channel.ctrStatus === 'low' ? 'text-red-600' : 
                        'text-yellow-600'
                      }>
                        {channel.clickThroughRate.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        channel.conversionStatus === 'high' ? 'text-green-600' : 
                        channel.conversionStatus === 'low' ? 'text-red-600' : 
                        'text-yellow-600'
                      }>
                        {channel.conversionRate.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        channel.cpcStatus === 'low' ? 'text-green-600' : 
                        channel.cpcStatus === 'high' ? 'text-red-600' : 
                        'text-yellow-600'
                      }>
                        {formatCurrency(channel.costPerClick)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(channel.costPerConversion)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Create a renderBudgetPlanningTab function similar to the other tab rendering functions
  const renderBudgetPlanningTab = () => {
    // Budget allocation optimization calculations
    const optimizedAllocation = useMemo(() => {
      // Calculate optimized allocation based on channel performance
      const performingChannels = channelEfficiency.filter(c => c.totalRevenue > 0 || c.totalSpend > 0);
      
      if (performingChannels.length === 0) return [];
      
      // Calculate ROI for each channel
      const channelsWithROI = performingChannels.map(channel => {
        const roi = channel.totalSpend > 0 
          ? (channel.totalRevenue - channel.totalSpend) / channel.totalSpend 
          : 0;
        
        return {
          ...channel,
          roi,
          // Higher conversion rates should get higher scores
          conversionScore: Math.min(channel.conversionRate / CHANNEL_BENCHMARKS.conversionRate.high, 2),
          // Lower cost per conversion is better
          cpaScore: channel.costPerConversion > 0 
            ? Math.min(1 / (channel.costPerConversion / 100), 3) 
            : 0,
          // Calculate an overall performance score
          performanceScore: 0 // Will be calculated below
        };
      });
      
      // Normalize scores and calculate overall performance
      const maxROI = Math.max(...channelsWithROI.map(c => Math.max(c.roi, 0)));
      const maxConvScore = Math.max(...channelsWithROI.map(c => c.conversionScore));
      const maxCPAScore = Math.max(...channelsWithROI.map(c => c.cpaScore));
      
      // Calculate performance score with weights
      channelsWithROI.forEach(c => {
        const roiWeight = 0.5;
        const convWeight = 0.3;
        const cpaWeight = 0.2;
        
        // Normalize each component 
        const normalizedROI = maxROI > 0 ? Math.max(c.roi, 0) / maxROI : 0;
        const normalizedConv = maxConvScore > 0 ? c.conversionScore / maxConvScore : 0;
        const normalizedCPA = maxCPAScore > 0 ? c.cpaScore / maxCPAScore : 0;
        
        c.performanceScore = (normalizedROI * roiWeight) + 
                             (normalizedConv * convWeight) + 
                             (normalizedCPA * cpaWeight);
      });
      
      // Sort by performance score
      channelsWithROI.sort((a, b) => b.performanceScore - a.performanceScore);
      
      // Calculate new budget allocation percentages
      const totalScore = channelsWithROI.reduce((sum, c) => sum + Math.max(c.performanceScore, 0.1), 0);
      
      return channelsWithROI.map(channel => ({
        ...channel,
        // Ensure even lowest performing channels get some budget (min 5%)
        suggestedAllocation: Math.max(
          (channel.performanceScore / totalScore) * 100,
          5
        )
      }));
    }, [channelEfficiency]);
    
    // Format suggestions for better display
    const formattedSuggestions = useMemo(() => {
      const currentBudget = marketingSummary.totalBudget;
      const forecastPeriod = currentProduct.info.forecastPeriod || 12;
      const weeklyBudget = currentBudget / forecastPeriod;
      
      return optimizedAllocation.map(channel => {
        // Current allocation
        const currentAllocation = marketingChannels.find(c => c.id === channel.id)?.allocation || 0;
        
        // Calculate suggested weekly amount
        const suggestedWeeklyAmount = (channel.suggestedAllocation / 100) * weeklyBudget;
        
        // Current weekly amount
        const currentWeeklyAmount = (currentAllocation / 100) * weeklyBudget;
        
        // Calculate change
        const change = channel.suggestedAllocation - currentAllocation;
        
        return {
          ...channel,
          currentAllocation,
          suggestedWeeklyAmount,
          currentWeeklyAmount, 
          change,
          impact: channel.roi > 0 ? 'positive' : channel.roi < -0.2 ? 'negative' : 'neutral'
        };
      });
    }, [optimizedAllocation, marketingSummary.totalBudget, marketingChannels, currentProduct.info.forecastPeriod]);
    
    // Generate a "what-if" forecast for budget changes
    const generateForecast = (increaseFactor: number) => {
      // Estimate revenue based on increased budget
      // Simple model: revenue increases logarithmically with budget
      const currentBudget = marketingSummary.totalBudget;
      const currentRevenue = marketingSummary.totalProjectedRevenue;
      
      // Using a logarithmic model: Revenue = a * ln(budget) + b
      // Where a and b are constants we can derive from the current data
      if (currentBudget <= 0 || currentRevenue <= 0) return { revenue: 0, profit: 0 };
      
      // Calculate constants
      const a = currentRevenue / Math.log(currentBudget);
      
      // Calculate new revenue
      const newBudget = currentBudget * increaseFactor;
      const newRevenue = a * Math.log(newBudget);
      
      // Calculate profit
      const newProfit = newRevenue - newBudget;
      const currentProfit = currentRevenue - currentBudget;
      
      return {
        budget: newBudget,
        revenue: newRevenue,
        profit: newProfit,
        budgetChange: (increaseFactor - 1) * 100,
        revenueChange: ((newRevenue / currentRevenue) - 1) * 100,
        profitChange: currentProfit > 0 ? ((newProfit / currentProfit) - 1) * 100 : 0
      };
    };
    
    // Generate forecasts for different budget scenarios
    const budgetScenarios = useMemo(() => {
      return [
        { label: "-25%", ...generateForecast(0.75) },
        { label: "-10%", ...generateForecast(0.9) },
        { label: "Current", ...generateForecast(1.0) },
        { label: "+10%", ...generateForecast(1.1) },
        { label: "+25%", ...generateForecast(1.25) }
      ];
    }, [marketingSummary]);
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="col-span-3 md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle>Budget Planning & Optimization</CardTitle>
              <CardDescription>
                Optimize your marketing budget allocation based on channel performance metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                Based on your historical channel performance data, we've generated the following budget allocation recommendations.
                These suggestions aim to maximize your marketing ROI by distributing your budget according to each channel's effectiveness.
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Allocation Recommendations */}
                <div>
                  <h3 className="text-md font-medium mb-2">Suggested Channel Allocation</h3>
                  
                  {formattedSuggestions.length === 0 ? (
                    <div className="bg-gray-50 rounded p-4 text-center">
                      <p className="text-gray-500">No channel performance data available to generate recommendations.</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Start tracking channel metrics in the Actuals Tracker to see suggestions.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Channel</TableHead>
                            <TableHead>Current</TableHead>
                            <TableHead>Suggested</TableHead>
                            <TableHead className="text-right">Weekly Budget</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formattedSuggestions.map(channel => (
                            <TableRow key={channel.id}>
                              <TableCell className="font-medium">{channel.name}</TableCell>
                              <TableCell>{channel.currentAllocation.toFixed(1)}%</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {channel.suggestedAllocation.toFixed(1)}%
                                  {Math.abs(channel.change) > 5 && (
                                    <span className={`ml-1 ${channel.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {channel.change > 0 ? '↑' : '↓'}
                                      {Math.abs(channel.change).toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(channel.suggestedWeeklyAmount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                
                {/* Budget Impact Analysis */}
                <div>
                  <h3 className="text-md font-medium mb-2">Budget Scenario Analysis</h3>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Scenario</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budgetScenarios.map(scenario => (
                          <TableRow key={scenario.label} className={scenario.label === "Current" ? "bg-gray-50" : ""}>
                            <TableCell className="font-medium">
                              {scenario.label}
                            </TableCell>
                            <TableCell>{formatCurrency(scenario.budget)}</TableCell>
                            <TableCell>
                              {formatCurrency(scenario.revenue)}
                              {scenario.label !== "Current" && (
                                <span className={`ml-1 text-xs ${scenario.revenueChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {scenario.revenueChange > 0 ? '↑' : '↓'}
                                  {Math.abs(scenario.revenueChange).toFixed(1)}%
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(scenario.profit)}
                              {scenario.label !== "Current" && scenario.profitChange !== 0 && (
                                <span className={`ml-1 text-xs ${scenario.profitChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {scenario.profitChange > 0 ? '↑' : '↓'}
                                  {Math.abs(scenario.profitChange).toFixed(1)}%
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm">
                    <p className="font-medium text-blue-800 mb-1">Budget Planning Insight</p>
                    <p className="text-blue-700">
                      {budgetScenarios[4].profitChange > budgetScenarios[3].profitChange ? 
                        "Increasing your marketing budget could lead to significant profit growth." :
                        budgetScenarios[1].profitChange > 0 ?
                          "A slight reduction in marketing budget may optimize your profit margin." :
                          "Your current budget allocation appears to be well optimized for profitability."}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Channel Performance Visualization */}
              <div className="mt-8">
                <h3 className="text-md font-medium mb-3">Channel Performance Matrix</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid />
                      <XAxis 
                        type="number" 
                        dataKey="conversionRate" 
                        name="Conversion Rate" 
                        unit="%" 
                        label={{ value: 'Conversion Rate (%)', position: 'bottom' }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="roi" 
                        name="ROI" 
                        unit="%" 
                        label={{ value: 'Return on Investment (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value.toFixed(2)}%`, '']}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-2 border rounded shadow-sm">
                                <p className="font-semibold">{data.name}</p>
                                <p>Conversion Rate: {data.conversionRate.toFixed(2)}%</p>
                                <p>ROI: {(data.roi * 100).toFixed(2)}%</p>
                                <p>Cost per Conversion: {formatCurrency(data.costPerConversion)}</p>
                                <p>Budget: {formatCurrency(data.budget)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <ReferenceLine y={0} stroke="#666" />
                      <ReferenceLine 
                        x={CHANNEL_BENCHMARKS.conversionRate.average} 
                        stroke="#f59e0b" 
                        strokeDasharray="3 3" 
                        label={{ value: 'Avg CVR', position: 'top' }} 
                      />
                      
                      <Scatter 
                        name="Marketing Channels" 
                        data={formattedSuggestions.map(c => ({
                          ...c,
                          // Convert ROI to percentage
                          roi: c.roi * 100
                        }))} 
                        fill="#8884d8"
                      >
                        {formattedSuggestions.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            // Size based on budget allocation
                            r={Math.max((entry.budget / (marketingSummary.totalBudget / formattedSuggestions.length)) * 10, 5)}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Bubble size represents current budget allocation. Channels in the top-right quadrant have the best performance.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-3 md:col-span-3">
            <CardHeader>
              <CardTitle>Budget Allocation Strategy</CardTitle>
              <CardDescription>
                Tactical recommendations to optimize your marketing budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Top Performing Channel */}
                {formattedSuggestions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <h4 className="font-medium text-green-800 mb-1">Top Performing Channel</h4>
                      <p className="text-lg font-bold text-green-700">
                        {formattedSuggestions[0].name}
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        ROI: {(formattedSuggestions[0].roi * 100).toFixed(2)}% • 
                        Conv: {formattedSuggestions[0].conversionRate.toFixed(2)}%
                      </p>
                      <p className="text-sm mt-2">
                        <span className="font-medium">Recommendation:</span> Increase allocation to {formattedSuggestions[0].suggestedAllocation.toFixed(1)}%
                      </p>
                    </div>
                    
                    {/* Underperforming Channel */}
                    {formattedSuggestions.filter(c => c.roi < 0).length > 0 && (
                      <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                        <h4 className="font-medium text-red-800 mb-1">Underperforming Channel</h4>
                        <p className="text-lg font-bold text-red-700">
                          {formattedSuggestions.filter(c => c.roi < 0).sort((a, b) => a.roi - b.roi)[0].name}
                        </p>
                        <p className="text-sm text-red-600 mt-1">
                          ROI: {(formattedSuggestions.filter(c => c.roi < 0).sort((a, b) => a.roi - b.roi)[0].roi * 100).toFixed(2)}%
                        </p>
                        <p className="text-sm mt-2">
                          <span className="font-medium">Recommendation:</span> Reevaluate campaign approach or reduce allocation
                        </p>
                      </div>
                    )}
                    
                    {/* Budget Opportunity */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-blue-800 mb-1">Budget Opportunity</h4>
                      <p className="text-lg font-bold text-blue-700">
                        {budgetScenarios[4].profitChange > 10 ? 
                          "Scaling Opportunity" : 
                          budgetScenarios[1].profitChange > 0 ? 
                            "Optimization Needed" : 
                            "Well Balanced"}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        Potential profit impact: {formatCurrency(budgetScenarios[4].profit - budgetScenarios[2].profit)}
                      </p>
                      <p className="text-sm mt-2">
                        <span className="font-medium">Recommendation:</span> {budgetScenarios[4].profitChange > 10 ? 
                          "Consider increasing overall budget by 25%" : 
                          budgetScenarios[1].profitChange > 0 ? 
                            "Optimize allocation before scaling" : 
                            "Maintain current budget level"}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Strategy Table */}
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Channel Strategy Recommendations</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Current Allocation</TableHead>
                        <TableHead>Recommendation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formattedSuggestions.map(channel => (
                        <TableRow key={channel.id}>
                          <TableCell className="font-medium">{channel.name}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              channel.impact === 'positive' ? 'bg-green-100 text-green-800' : 
                              channel.impact === 'negative' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {channel.impact === 'positive' ? 'High Performing' : 
                              channel.impact === 'negative' ? 'Underperforming' : 
                              'Average'}
                            </span>
                          </TableCell>
                          <TableCell>{channel.currentAllocation.toFixed(1)}% ({formatCurrency(channel.currentWeeklyAmount)}/week)</TableCell>
                          <TableCell>
                            {channel.impact === 'positive' ? 
                              `Increase to ${channel.suggestedAllocation.toFixed(1)}% (${formatCurrency(channel.suggestedWeeklyAmount)}/week)` : 
                            channel.impact === 'negative' ? 
                              `Reduce to ${channel.suggestedAllocation.toFixed(1)}% or improve campaigns` : 
                              `Maintain around ${channel.suggestedAllocation.toFixed(1)}%`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Key Insights */}
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <h4 className="font-medium mb-2">Key Budget Insights</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Your current marketing-to-revenue ratio is <span className="font-medium">{marketingSummary.ratio.toFixed(1)}%</span>, which is
                      <span className={`ml-1 ${
                        marketingSummary.status === 'healthy' ? 'text-green-600' : 
                        marketingSummary.status === 'low' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {marketingSummary.status === 'healthy' ? 'within the optimal range' : 
                        marketingSummary.status === 'low' ? 'below the recommended range' : 
                        'above the recommended range'}
                      </span>.
                    </li>
                    {formattedSuggestions.length > 0 && (
                      <>
                        <li>
                          {formattedSuggestions.filter(c => c.roi > 0.5).length > 0 ?
                            `${formattedSuggestions.filter(c => c.roi > 0.5).length} channels are delivering ROI above 50%. Consider reallocating budget to these channels.` :
                            'None of your channels are delivering exceptional ROI. Consider testing new marketing approaches.'}
                        </li>
                        <li>
                          The optimal marketing mix based on performance would allocate
                          {formattedSuggestions.slice(0, 2).map((c, i) => (
                            <span key={c.id} className="font-medium">
                              {i === 0 ? ' ' : ' and '}
                              {c.suggestedAllocation.toFixed(1)}% to {c.name}
                            </span>
                          ))}
                          {formattedSuggestions.length > 2 ? ` and distribute the remaining among other channels.` : '.'}
                        </li>
                      </>
                    )}
                    <li>
                      {budgetScenarios[4].profitChange > 10 ?
                        `Increasing your marketing budget by 25% could potentially generate ${formatCurrency(budgetScenarios[4].profit - budgetScenarios[2].profit)} in additional profit.` :
                        budgetScenarios[1].profitChange > 0 ?
                          `Optimizing your budget allocation could improve profitability even with a slightly smaller overall marketing budget.` :
                          `Your current budget level appears well-balanced for your revenue goals.`}
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Marketing Analytics</h1>
        <div className="flex space-x-2 items-center">
          <Label htmlFor="timeframe" className="mr-2">Timeframe:</Label>
          <Select 
            value={selectedTimeframe} 
            onValueChange={(value) => setSelectedTimeframe(value as any)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="last4weeks">Last 4 Weeks</SelectItem>
              <SelectItem value="last3months">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart className="h-4 w-4 mr-2" />
            Performance Dashboard
          </TabsTrigger>
          <TabsTrigger value="channels">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Channel Analysis
          </TabsTrigger>
          <TabsTrigger value="budget">
            <LayoutIcon className="h-4 w-4 mr-2" />
            Budget Planning
          </TabsTrigger>
          <TabsTrigger value="impact">
            <TrendingUp className="h-4 w-4 mr-2" />
            Impact Analysis
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-4">
          <TabsContent value="dashboard">
            {renderDashboardTab()}
          </TabsContent>
          
          <TabsContent value="channels">
            {renderChannelAnalysisTab()}
          </TabsContent>
          
          <TabsContent value="budget">
            {renderBudgetPlanningTab()}
          </TabsContent>
          
          <TabsContent value="impact">
            <div className="p-8 text-center border rounded-md">
              <h3 className="text-lg font-medium mb-2">Impact Analysis Coming Soon</h3>
              <p className="text-gray-500">
                Comprehensive impact analysis will be available in Phase 4 of our marketing analytics update.
              </p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
