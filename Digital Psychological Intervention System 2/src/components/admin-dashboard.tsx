import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
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
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertTriangle, 
  Activity,
  Brain,
  MessageSquare,
  ClipboardCheck
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId } from '../utils/supabase/info'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Analytics {
  riskAnalytics: Array<{
    date: string
    low: number
    moderate: number
    high: number
    crisis: number
  }>
  assessmentAnalytics: Array<{
    date: string
    'PHQ-9': number
    'GAD-7': number
  }>
  usersByRole: {
    student: number
    counsellor: number
    admin: number
  }
  totalAppointments: number
  totalUsers: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AdminDashboard({ user, accessToken }: { user: User, accessToken: string | null }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  useEffect(() => {
    loadAnalytics()
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadAnalytics, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/analytics`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        console.error('Failed to load analytics')
        toast.error('Failed to load analytics data')
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const processRiskData = () => {
    if (!analytics?.riskAnalytics) return []
    
    return analytics.riskAnalytics.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      Low: item.low || 0,
      Moderate: item.moderate || 0,
      High: item.high || 0,
      Crisis: item.crisis || 0,
      Total: (item.low || 0) + (item.moderate || 0) + (item.high || 0) + (item.crisis || 0)
    })).slice(-7) // Last 7 days
  }

  const processAssessmentData = () => {
    if (!analytics?.assessmentAnalytics) return []
    
    return analytics.assessmentAnalytics.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      'PHQ-9': item['PHQ-9'] || 0,
      'GAD-7': item['GAD-7'] || 0
    })).slice(-7)
  }

  const getRiskPieData = () => {
    const riskData = processRiskData()
    const totals = riskData.reduce((acc, day) => ({
      Low: acc.Low + day.Low,
      Moderate: acc.Moderate + day.Moderate,
      High: acc.High + day.High,
      Crisis: acc.Crisis + day.Crisis
    }), { Low: 0, Moderate: 0, High: 0, Crisis: 0 })

    return [
      { name: 'Low Risk', value: totals.Low, color: '#00C49F' },
      { name: 'Moderate Risk', value: totals.Moderate, color: '#FFBB28' },
      { name: 'High Risk', value: totals.High, color: '#FF8042' },
      { name: 'Crisis', value: totals.Crisis, color: '#FF4444' }
    ].filter(item => item.value > 0)
  }

  const getUserRoleData = () => {
    if (!analytics?.usersByRole) return []
    
    return Object.entries(analytics.usersByRole).map(([role, count]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      value: count,
      color: role === 'student' ? '#0088FE' : role === 'counsellor' ? '#00C49F' : '#FFBB28'
    }))
  }

  const getOverallStats = () => {
    const riskData = processRiskData()
    const totalInteractions = riskData.reduce((sum, day) => sum + day.Total, 0)
    const crisisCases = riskData.reduce((sum, day) => sum + day.Crisis, 0)
    const highRiskCases = riskData.reduce((sum, day) => sum + day.High, 0)
    
    return {
      totalInteractions,
      crisisCases,
      highRiskCases,
      crisisRate: totalInteractions > 0 ? ((crisisCases / totalInteractions) * 100).toFixed(1) : '0'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  const stats = getOverallStats()
  const riskChartData = processRiskData()
  const assessmentChartData = processAssessmentData()
  const riskPieData = getRiskPieData()
  const userRoleData = getUserRoleData()

  return (
    <div className="space-y-6">
      {/* Real-time Status Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <Activity className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800 font-medium">Real-time Analytics Dashboard</span>
          <Badge variant="outline" className="ml-2">Live</Badge>
        </div>
        <p className="text-green-700 text-sm mt-1">
          Data updates automatically every 30 seconds from student interactions
        </p>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{analytics.totalUsers}</p>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <MessageSquare className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.totalInteractions}</p>
              <p className="text-sm text-gray-600">AI Interactions (7d)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Calendar className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{analytics.totalAppointments}</p>
              <p className="text-sm text-gray-600">Total Appointments</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.crisisCases}</p>
              <p className="text-sm text-gray-600">Crisis Cases (7d)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="risk-analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="risk-analysis">Risk Analysis</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="user-demographics">User Demographics</TabsTrigger>
          <TabsTrigger value="trends">Trends & Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="risk-analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Levels Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Risk Levels - Last 7 Days
                </CardTitle>
                <CardDescription>
                  Daily breakdown of AI-assessed risk levels from student interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Low" stackId="a" fill="#00C49F" />
                    <Bar dataKey="Moderate" stackId="a" fill="#FFBB28" />
                    <Bar dataKey="High" stackId="a" fill="#FF8042" />
                    <Bar dataKey="Crisis" stackId="a" fill="#FF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>
                  Overall distribution of risk levels (7 days)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Crisis Alert Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Crisis Intervention Summary
              </CardTitle>
              <CardDescription>
                Critical statistics requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{stats.crisisCases}</p>
                  <p className="text-sm text-red-800">Crisis Cases (7d)</p>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{stats.highRiskCases}</p>
                  <p className="text-sm text-orange-800">High Risk Cases (7d)</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.crisisRate}%</p>
                  <p className="text-sm text-blue-800">Crisis Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardCheck className="h-5 w-5 mr-2" />
                Self-Assessment Completions
              </CardTitle>
              <CardDescription>
                Daily completion rates for PHQ-9 and GAD-7 assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={assessmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="PHQ-9" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="GAD-7" 
                    stroke="#82ca9d" 
                    strokeWidth={3}
                    dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total PHQ-9 Completed</span>
                    <Badge variant="outline">
                      {assessmentChartData.reduce((sum, day) => sum + day['PHQ-9'], 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total GAD-7 Completed</span>
                    <Badge variant="outline">
                      {assessmentChartData.reduce((sum, day) => sum + day['GAD-7'], 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Assessment Engagement Rate</span>
                    <Badge variant="default">
                      {analytics.totalUsers > 0 ? 
                        (((assessmentChartData.reduce((sum, day) => sum + day['PHQ-9'] + day['GAD-7'], 0)) / analytics.totalUsers) * 100).toFixed(1) 
                        : '0'}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assessment Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Peak Assessment Day</p>
                    <p className="text-xs text-blue-600">
                      {assessmentChartData.length > 0 ? 
                        assessmentChartData.reduce((max, day) => 
                          (day['PHQ-9'] + day['GAD-7']) > (max['PHQ-9'] + max['GAD-7']) ? day : max
                        ).date : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Most Popular Assessment</p>
                    <p className="text-xs text-green-600">
                      {assessmentChartData.reduce((sum, day) => sum + day['PHQ-9'], 0) > 
                       assessmentChartData.reduce((sum, day) => sum + day['GAD-7'], 0) ? 
                       'PHQ-9 (Depression)' : 'GAD-7 (Anxiety)'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="user-demographics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  User Distribution by Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userRoleData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userRoleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Registered Users</span>
                    <Badge variant="default">{analytics.totalUsers}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Active Students</span>
                    <Badge variant="outline">{analytics.usersByRole.student || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Available Counsellors</span>
                    <Badge variant="outline">{analytics.usersByRole.counsellor || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>System Administrators</span>
                    <Badge variant="outline">{analytics.usersByRole.admin || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Student-to-Counsellor Ratio</span>
                    <Badge variant="secondary">
                      {analytics.usersByRole.counsellor > 0 ? 
                        Math.round(analytics.usersByRole.student / analytics.usersByRole.counsellor) : 'N/A'}:1
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Mental Health Trends
              </CardTitle>
              <CardDescription>
                Combined view of risk assessments and user engagement over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={riskChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="Total" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Crisis" 
                    stroke="#FF4444" 
                    fill="#FF4444" 
                    fillOpacity={0.8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Overall Engagement</p>
                    <p className="text-xs text-blue-600">
                      {stats.totalInteractions > 0 ? 'Active' : 'Low'} - {stats.totalInteractions} interactions this week
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">Risk Pattern</p>
                    <p className="text-xs text-yellow-600">
                      {stats.crisisRate}% crisis rate requires monitoring
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800">System Health</p>
                    <p className="text-xs text-green-600">
                      {analytics.totalAppointments} appointments booked, system functioning well
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.crisisCases > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800">Immediate Action Required</p>
                      <p className="text-xs text-red-600">
                        {stats.crisisCases} crisis cases need counsellor follow-up
                      </p>
                    </div>
                  )}
                  {(analytics.usersByRole.counsellor / analytics.usersByRole.student) < 0.1 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm font-medium text-orange-800">Resource Planning</p>
                      <p className="text-xs text-orange-600">
                        Consider increasing counsellor capacity
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Data Quality</p>
                    <p className="text-xs text-blue-600">
                      Analytics updating in real-time from {analytics.totalUsers} users
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}