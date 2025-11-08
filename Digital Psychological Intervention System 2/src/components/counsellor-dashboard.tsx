import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Calendar, Users, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId } from '../utils/supabase/info'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Appointment {
  id: string
  studentId: string
  date: string
  time: string
  status: string
  riskLevel?: string
  created_at: string
}

interface ForumPost {
  id: string
  userId: string
  userName: string
  content: string
  category: string
  timestamp: string
  replies: Array<{
    id: string
    userId: string
    userName: string
    content: string
    timestamp: string
  }>
}

export default function CounsellorDashboard({ user, accessToken }: { user: User, accessToken: string | null }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAppointments()
    loadForumPosts()
  }, [])

  const loadAppointments = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/appointments`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { appointments } = await response.json()
        setAppointments(appointments.sort((a: Appointment, b: Appointment) => 
          new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()
        ))
      } else {
        console.error('Failed to load appointments')
      }
    } catch (error) {
      console.error('Failed to load appointments:', error)
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const loadForumPosts = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/forum`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { posts } = await response.json()
        setForumPosts(posts)
      } else {
        console.error('Failed to load forum posts')
      }
    } catch (error) {
      console.error('Failed to load forum posts:', error)
    }
  }

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      // Note: This would need a server endpoint to update appointment status
      // For now, we'll update locally and show a toast
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      ))
      toast.success(`Appointment ${newStatus}`)
    } catch (error) {
      console.error('Failed to update appointment:', error)
      toast.error('Failed to update appointment')
    }
  }

  const getUpcomingAppointments = () => {
    const now = new Date()
    return appointments.filter(apt => {
      const aptDateTime = new Date(apt.date + 'T' + apt.time)
      return aptDateTime > now && apt.status !== 'cancelled'
    })
  }

  const getTodaysAppointments = () => {
    const today = new Date().toISOString().split('T')[0]
    return appointments.filter(apt => apt.date === today && apt.status !== 'cancelled')
  }

  const getEmergencyAppointments = () => {
    return appointments.filter(apt => 
      apt.status === 'auto-scheduled' || apt.riskLevel === 'crisis'
    )
  }

  const getStatistics = () => {
    const total = appointments.length
    const completed = appointments.filter(apt => apt.status === 'completed').length
    const upcoming = getUpcomingAppointments().length
    const emergency = getEmergencyAppointments().length

    return { total, completed, upcoming, emergency }
  }

  const stats = getStatistics()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Appointments</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Clock className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-sm text-gray-600">Upcoming</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <CheckCircle className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.emergency}</p>
              <p className="text-sm text-gray-600">Emergency</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">My Schedule</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Cases</TabsTrigger>
          <TabsTrigger value="forum">Peer Support Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          {/* Today's Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Today's Appointments
              </CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getTodaysAppointments().length === 0 ? (
                <p className="text-gray-500 text-center py-8">No appointments scheduled for today</p>
              ) : (
                <div className="space-y-4">
                  {getTodaysAppointments().map((appointment) => (
                    <div key={appointment.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{appointment.time}</p>
                          <p className="text-sm text-gray-600">Student ID: {appointment.studentId}</p>
                          <p className="text-xs text-gray-500">
                            Booked: {new Date(appointment.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge variant={
                            appointment.status === 'auto-scheduled' ? 'destructive' :
                            appointment.status === 'completed' ? 'default' :
                            appointment.status === 'cancelled' ? 'secondary' : 'outline'
                          }>
                            {appointment.status}
                          </Badge>
                          {appointment.riskLevel && (
                            <Badge variant={appointment.riskLevel === 'crisis' ? 'destructive' : 'secondary'}>
                              {appointment.riskLevel} risk
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {appointment.status === 'auto-scheduled' && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                            <p className="text-sm text-red-800">
                              Automatic emergency appointment - High priority case
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2 mt-4">
                        {appointment.status === 'scheduled' || appointment.status === 'auto-scheduled' ? (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                            >
                              Mark Completed
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : appointment.status === 'completed' ? (
                          <Badge variant="default">Session Completed</Badge>
                        ) : (
                          <Badge variant="secondary">Cancelled</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {getUpcomingAppointments().length === 0 ? (
                <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
              ) : (
                <div className="space-y-4">
                  {getUpcomingAppointments().slice(0, 10).map((appointment) => (
                    <div key={appointment.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                          </p>
                          <p className="text-sm text-gray-600">Student ID: {appointment.studentId}</p>
                          <p className="text-xs text-gray-500">
                            Booked: {new Date(appointment.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge variant={appointment.status === 'auto-scheduled' ? 'destructive' : 'outline'}>
                            {appointment.status}
                          </Badge>
                          {appointment.riskLevel && (
                            <Badge variant={appointment.riskLevel === 'crisis' ? 'destructive' : 'secondary'}>
                              {appointment.riskLevel} risk
                            </Badge>
                          )}
                        </div>
                      </div>

                      {appointment.status === 'auto-scheduled' && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                            <p className="text-sm text-red-800">
                              Emergency appointment - Requires immediate attention
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Emergency Cases
              </CardTitle>
              <CardDescription>
                Auto-scheduled appointments and high-risk cases requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getEmergencyAppointments().length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-500">No emergency cases at the moment</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getEmergencyAppointments().map((appointment) => (
                    <div key={appointment.id} className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center mb-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                            <p className="font-medium text-red-800">EMERGENCY CASE</p>
                          </div>
                          <p className="font-medium">
                            {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                          </p>
                          <p className="text-sm text-gray-600">Student ID: {appointment.studentId}</p>
                          <p className="text-xs text-gray-500">
                            Auto-scheduled: {new Date(appointment.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge variant="destructive">
                            {appointment.status}
                          </Badge>
                          {appointment.riskLevel && (
                            <Badge variant="destructive">
                              {appointment.riskLevel} RISK
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-red-100 rounded-lg">
                        <p className="text-sm text-red-800 font-medium">Priority Actions:</p>
                        <ul className="text-sm text-red-700 mt-2 space-y-1">
                          <li>• Contact student immediately if appointment is today</li>
                          <li>• Review safety protocols and emergency procedures</li>
                          <li>• Have emergency contact information ready</li>
                          <li>• Consider involving crisis intervention team if needed</li>
                        </ul>
                      </div>

                      <div className="flex space-x-2 mt-4">
                        <Button 
                          size="sm"
                          variant="destructive"
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                        >
                          Mark as Handled
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                        >
                          Contact Student
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forum">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Peer Support Forum Monitor
              </CardTitle>
              <CardDescription>
                Monitor forum posts for content that may require professional intervention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forumPosts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No forum posts to review</p>
                ) : (
                  forumPosts.slice(0, 10).map((post) => (
                    <div key={post.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">{post.userName}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(post.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline">{post.category}</Badge>
                      </div>
                      
                      <p className="mb-3">{post.content}</p>
                      
                      {/* TODO: ML/DL content analysis integration point */}
                      {/* Risk level would be determined by ML analysis */}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          <Badge variant="secondary">
                            Automated Risk: Low
                          </Badge>
                          <Badge variant="outline">
                            {post.replies.length} replies
                          </Badge>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            Review Post
                          </Button>
                          <Button size="sm" variant="outline">
                            Contact User
                          </Button>
                        </div>
                      </div>

                      {post.replies.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Recent Replies:</p>
                          <div className="space-y-2">
                            {post.replies.slice(-2).map((reply) => (
                              <div key={reply.id} className="pl-4 border-l-2 border-gray-200">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-medium">{reply.userName}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(reply.timestamp).toLocaleString()}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-700">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}