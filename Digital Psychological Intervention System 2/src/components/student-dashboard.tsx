import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { MessageCircle, Calendar, BookOpen, Users, ClipboardCheck, Send, Bot, User, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { projectId } from '../utils/supabase/info'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface ChatMessage {
  id: string
  message: string
  isUser: boolean
  riskLevel?: string
  timestamp: string
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

interface Appointment {
  id: string
  counsellorId: string
  date: string
  time: string
  status: string
  riskLevel?: string
}

interface Counsellor {
  id: string
  name: string
  email: string
}

export default function StudentDashboard({ user, accessToken }: { user: User, accessToken: string | null }) {
  const [activeTab, setActiveTab] = useState('chat')
  
  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  // Forum states
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [newPost, setNewPost] = useState('')
  const [postCategory, setPostCategory] = useState('general')
  const [replyContent, setReplyContent] = useState<{[key: string]: string}>({})
  
  // Appointment states
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [counsellors, setCounsellors] = useState<Counsellor[]>([])
  const [selectedCounsellor, setSelectedCounsellor] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  
  // Assessment states
  const [assessmentType, setAssessmentType] = useState('PHQ-9')
  const [assessmentScores, setAssessmentScores] = useState<number[]>([])
  const [assessmentResult, setAssessmentResult] = useState<any>(null)

  const PHQ9_QUESTIONS = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself or that you are a failure",
    "Trouble concentrating on things",
    "Moving or speaking slowly or being fidgety",
    "Thoughts that you would be better off dead"
  ]

  const GAD7_QUESTIONS = [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it's hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid as if something awful might happen"
  ]

  useEffect(() => {
    loadChatHistory()
    loadForumPosts()
    loadAppointments()
    loadCounsellors()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/chat/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { messages } = await response.json()
        setChatMessages(messages)
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
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
      }
    } catch (error) {
      console.error('Failed to load forum posts:', error)
    }
  }

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
        setAppointments(appointments)
      }
    } catch (error) {
      console.error('Failed to load appointments:', error)
    }
  }

  const loadCounsellors = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/counsellors`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { counsellors } = await response.json()
        setCounsellors(counsellors)
      }
    } catch (error) {
      console.error('Failed to load counsellors:', error)
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim()) return

    try {
      // Add user message to chat
      const userMessage = {
        id: Date.now().toString(),
        message: currentMessage,
        isUser: true,
        timestamp: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, userMessage])

      // TODO: ML/DL risk assessment integration point
      // const riskAnalysis = await assessRisk(currentMessage)
      // For now, we'll simulate risk assessment based on keywords
      const riskLevel = assessRiskBasedOnKeywords(currentMessage)

      // Save user message
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: currentMessage,
          isUser: true,
          riskLevel
        })
      })

      // Generate AI response
      const aiResponse = generateAIResponse(currentMessage, riskLevel)
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        message: aiResponse,
        isUser: false,
        timestamp: new Date().toISOString()
      }

      setTimeout(() => {
        setChatMessages(prev => [...prev, botMessage])
      }, 1000)

      // Save AI response
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: aiResponse,
          isUser: false
        })
      })

      // Show crisis notification if needed
      if (riskLevel === 'crisis') {
        toast.error('Emergency Support: An automatic appointment has been scheduled. Please check your appointments and visit the resources section immediately.')
        loadAppointments() // Refresh appointments
      } else if (riskLevel === 'high') {
        toast.warning('High Risk Detected: Please consider booking an appointment with a counsellor and check our resources.')
      }

      setCurrentMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    }
  }

  const assessRiskBasedOnKeywords = (message: string): string => {
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'die', 'harm myself']
    const highRiskKeywords = ['hopeless', 'worthless', 'desperate', 'can\'t cope', 'overwhelming']
    const moderateRiskKeywords = ['sad', 'anxious', 'worried', 'stressed', 'depressed']

    const lowerMessage = message.toLowerCase()

    if (crisisKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'crisis'
    } else if (highRiskKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'high'
    } else if (moderateRiskKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'moderate'
    }
    
    return 'low'
  }

  const generateAIResponse = (message: string, riskLevel: string): string => {
    const responses = {
      crisis: [
        "I'm very concerned about what you're going through. Your safety is my top priority. I've scheduled an emergency appointment for you with a counsellor. Please also contact emergency services if you're in immediate danger: National Suicide Prevention Lifeline: 988. You are not alone, and help is available.",
        "This sounds like you're in crisis, and I want you to know that your life has value. I've arranged urgent support for you. Please reach out to crisis helpline: 988 or visit your nearest emergency room if you're in immediate danger. A counsellor appointment has been automatically scheduled."
      ],
      high: [
        "I can hear that you're struggling with something really difficult right now. These feelings are valid, and seeking help shows strength. I've found some resources that might help, and I'd strongly encourage you to book an appointment with one of our counsellors. Would you like me to help you with that?",
        "It sounds like you're going through a really tough time. Please know that you don't have to face this alone. I'd recommend speaking with a professional counsellor who can provide personalized support. Check out our resources section for immediate coping strategies."
      ],
      moderate: [
        "Thank you for sharing that with me. It's completely normal to feel this way sometimes. Here are some coping strategies that might help: deep breathing exercises, grounding techniques, or talking to someone you trust. Our resources section has some helpful videos and guides.",
        "I understand you're dealing with some challenging feelings. Self-care is important during times like this. Consider activities like mindfulness, gentle exercise, or journaling. If these feelings persist, don't hesitate to reach out to a counsellor."
      ],
      low: [
        "I hear you, and I'm glad you felt comfortable sharing. It's great that you're being proactive about your mental health. Our resources section has some helpful materials on maintaining wellness and building resilience.",
        "Thank you for reaching out. Taking care of your mental health is important. Feel free to explore our peer support forums to connect with others, or check out our resources for wellness tips."
      ]
    }

    const categoryResponses = responses[riskLevel as keyof typeof responses] || responses.low
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)]
  }

  const createForumPost = async () => {
    if (!newPost.trim()) return

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/forum`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newPost,
          category: postCategory
        })
      })

      if (response.ok) {
        toast.success('Post created successfully')
        setNewPost('')
        loadForumPosts()
      } else {
        toast.error('Failed to create post')
      }
    } catch (error) {
      console.error('Failed to create post:', error)
      toast.error('Failed to create post')
    }
  }

  const replyToPost = async (postId: string) => {
    const content = replyContent[postId]
    if (!content?.trim()) return

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/forum/${postId}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })

      if (response.ok) {
        toast.success('Reply posted successfully')
        setReplyContent(prev => ({ ...prev, [postId]: '' }))
        loadForumPosts()
      } else {
        toast.error('Failed to post reply')
      }
    } catch (error) {
      console.error('Failed to post reply:', error)
      toast.error('Failed to post reply')
    }
  }

  const bookAppointment = async () => {
    if (!selectedCounsellor || !appointmentDate || !appointmentTime) {
      toast.error('Please fill all appointment details')
      return
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/appointment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          counsellorId: selectedCounsellor,
          date: appointmentDate,
          time: appointmentTime
        })
      })

      if (response.ok) {
        toast.success('Appointment booked successfully')
        setSelectedCounsellor('')
        setAppointmentDate('')
        setAppointmentTime('')
        loadAppointments()
      } else {
        toast.error('Failed to book appointment')
      }
    } catch (error) {
      console.error('Failed to book appointment:', error)
      toast.error('Failed to book appointment')
    }
  }

  const submitAssessment = async () => {
    if (assessmentScores.length === 0) {
      toast.error('Please complete the assessment')
      return
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/assessment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: assessmentType,
          scores: assessmentScores,
          responses: assessmentScores
        })
      })

      if (response.ok) {
        const { assessment } = await response.json()
        setAssessmentResult(assessment)
        toast.success('Assessment completed successfully')
      } else {
        toast.error('Failed to submit assessment')
      }
    } catch (error) {
      console.error('Failed to submit assessment:', error)
      toast.error('Failed to submit assessment')
    }
  }

  const getResourcesByRiskLevel = (riskLevel: string) => {
    const resources = {
      crisis: [
        { title: "Crisis Support - National Suicide Prevention Lifeline", url: "https://www.youtube.com/watch?v=example1", type: "Emergency" },
        { title: "Emergency Coping Strategies", url: "https://www.youtube.com/watch?v=example2", type: "Video" },
        { title: "Immediate Safety Planning", url: "https://www.example.com/safety-plan", type: "Guide" }
      ],
      high: [
        { title: "Managing Severe Depression", url: "https://www.youtube.com/watch?v=example3", type: "Video" },
        { title: "Anxiety Coping Techniques", url: "https://www.youtube.com/watch?v=example4", type: "Video" },
        { title: "When to Seek Professional Help", url: "https://www.example.com/seek-help", type: "Article" }
      ],
      moderate: [
        { title: "Mindfulness for Mental Health", url: "https://www.youtube.com/watch?v=example5", type: "Video" },
        { title: "Stress Management Techniques", url: "https://www.youtube.com/watch?v=example6", type: "Video" },
        { title: "Building Resilience", url: "https://www.example.com/resilience", type: "Guide" }
      ],
      low: [
        { title: "Daily Wellness Practices", url: "https://www.youtube.com/watch?v=example7", type: "Video" },
        { title: "Maintaining Mental Health", url: "https://www.youtube.com/watch?v=example8", type: "Video" },
        { title: "Self-Care Strategies", url: "https://www.example.com/self-care", type: "Article" }
      ]
    }

    return resources[riskLevel as keyof typeof resources] || resources.low
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('chat')}>
          <CardContent className="flex items-center p-4">
            <MessageCircle className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium">AI Support</p>
              <p className="text-sm text-gray-600">Chat with AI counsellor</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('appointments')}>
          <CardContent className="flex items-center p-4">
            <Calendar className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="font-medium">Book Session</p>
              <p className="text-sm text-gray-600">Schedule counselling</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('resources')}>
          <CardContent className="flex items-center p-4">
            <BookOpen className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="font-medium">Resources</p>
              <p className="text-sm text-gray-600">Helpful materials</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('forum')}>
          <CardContent className="flex items-center p-4">
            <Users className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="font-medium">Peer Support</p>
              <p className="text-sm text-gray-600">Community forum</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="chat">AI Support</TabsTrigger>
          <TabsTrigger value="appointments">Book Session</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="forum">Peer Support</TabsTrigger>
          <TabsTrigger value="assessment">Self Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Guided Support Chat</CardTitle>
              <CardDescription>
                Talk to our AI counsellor for immediate support and guidance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-20">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                    <p>Start a conversation with our AI counsellor</p>
                    <p className="text-sm">Your conversations are confidential and secure</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className={`flex mb-4 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex items-start max-w-xs lg:max-w-md ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex-shrink-0 ${message.isUser ? 'ml-2' : 'mr-2'}`}>
                          {message.isUser ? (
                            <User className="h-8 w-8 text-blue-600" />
                          ) : (
                            <Bot className="h-8 w-8 text-green-600" />
                          )}
                        </div>
                        <div className={`px-4 py-2 rounded-lg ${
                          message.isUser 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          {message.riskLevel && (
                            <Badge variant={message.riskLevel === 'crisis' ? 'destructive' : 'secondary'} className="mt-2">
                              {message.riskLevel} risk
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="flex space-x-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Book New Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Counsellor</label>
                  <Select value={selectedCounsellor} onValueChange={setSelectedCounsellor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a counsellor" />
                    </SelectTrigger>
                    <SelectContent>
                      {counsellors.map((counsellor) => (
                        <SelectItem key={counsellor.id} value={counsellor.id}>
                          {counsellor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <Input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="11:00">11:00 AM</SelectItem>
                      <SelectItem value="14:00">2:00 PM</SelectItem>
                      <SelectItem value="15:00">3:00 PM</SelectItem>
                      <SelectItem value="16:00">4:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={bookAppointment} className="w-full">
                  Book Appointment
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No appointments booked</p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{appointment.date} at {appointment.time}</p>
                            <p className="text-sm text-gray-600">Counsellor ID: {appointment.counsellorId}</p>
                            <Badge variant={appointment.status === 'auto-scheduled' ? 'destructive' : 'default'}>
                              {appointment.status}
                            </Badge>
                          </div>
                          {appointment.riskLevel && (
                            <Badge variant="secondary">
                              {appointment.riskLevel} risk
                            </Badge>
                          )}
                        </div>
                        {appointment.status === 'auto-scheduled' && (
                          <div className="mt-2 p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center">
                              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                              <p className="text-sm text-red-800">
                                Emergency appointment - Please attend and check resources
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Mental Health Resources</CardTitle>
              <CardDescription>
                Curated resources based on your needs and interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="general">
                <TabsList>
                  <TabsTrigger value="general">General Wellness</TabsTrigger>
                  <TabsTrigger value="crisis">Crisis Support</TabsTrigger>
                  <TabsTrigger value="anxiety">Anxiety</TabsTrigger>
                  <TabsTrigger value="depression">Depression</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  {getResourcesByRiskLevel('low').map((resource, index) => (
                    <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{resource.title}</h3>
                          <Badge variant="outline">{resource.type}</Badge>
                        </div>
                        <Button variant="outline" asChild>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="crisis" className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-medium text-red-800 mb-2">Emergency Resources</h3>
                    <p className="text-red-700 text-sm mb-3">If you're in immediate danger, please call emergency services or go to your nearest emergency room.</p>
                    <p className="text-red-700 text-sm">National Suicide Prevention Lifeline: 988</p>
                  </div>
                  {getResourcesByRiskLevel('crisis').map((resource, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{resource.title}</h3>
                          <Badge variant="destructive">{resource.type}</Badge>
                        </div>
                        <Button variant="outline" asChild>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="anxiety" className="space-y-4">
                  {getResourcesByRiskLevel('moderate').map((resource, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{resource.title}</h3>
                          <Badge variant="outline">{resource.type}</Badge>
                        </div>
                        <Button variant="outline" asChild>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="depression" className="space-y-4">
                  {getResourcesByRiskLevel('high').map((resource, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{resource.title}</h3>
                          <Badge variant="outline">{resource.type}</Badge>
                        </div>
                        <Button variant="outline" asChild>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forum">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Post</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={postCategory} onValueChange={setPostCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Support</SelectItem>
                    <SelectItem value="anxiety">Anxiety</SelectItem>
                    <SelectItem value="depression">Depression</SelectItem>
                    <SelectItem value="stress">Stress Management</SelectItem>
                    <SelectItem value="relationships">Relationships</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share your thoughts or ask for support... (No inappropriate content allowed)"
                  rows={4}
                />
                <Button onClick={createForumPost}>Post</Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {forumPosts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-medium">{post.userName}</p>
                        <p className="text-sm text-gray-600">{new Date(post.timestamp).toLocaleString()}</p>
                      </div>
                      <Badge variant="outline">{post.category}</Badge>
                    </div>
                    <p className="mb-4">{post.content}</p>
                    
                    {post.replies.length > 0 && (
                      <div className="border-t pt-4 space-y-3">
                        <h4 className="font-medium text-sm">Replies</h4>
                        {post.replies.map((reply) => (
                          <div key={reply.id} className="pl-4 border-l-2 border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-medium text-sm">{reply.userName}</p>
                              <p className="text-xs text-gray-500">{new Date(reply.timestamp).toLocaleString()}</p>
                            </div>
                            <p className="text-sm">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Write a reply..."
                          value={replyContent[post.id] || ''}
                          onChange={(e) => setReplyContent(prev => ({ ...prev, [post.id]: e.target.value }))}
                        />
                        <Button onClick={() => replyToPost(post.id)} size="sm">
                          Reply
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assessment">
          <Card>
            <CardHeader>
              <CardTitle>Mental Health Self-Assessment</CardTitle>
              <CardDescription>
                Complete standardized assessments to better understand your mental health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Select value={assessmentType} onValueChange={setAssessmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHQ-9">PHQ-9 (Depression Screening)</SelectItem>
                  <SelectItem value="GAD-7">GAD-7 (Anxiety Screening)</SelectItem>
                </SelectContent>
              </Select>

              {assessmentType === 'PHQ-9' && (
                <div className="space-y-4">
                  <h3 className="font-medium">Over the last 2 weeks, how often have you been bothered by:</h3>
                  {PHQ9_QUESTIONS.map((question, index) => (
                    <div key={index} className="space-y-2">
                      <p className="text-sm">{index + 1}. {question}</p>
                      <Select
                        value={assessmentScores[index]?.toString() || ''}
                        onValueChange={(value) => {
                          const newScores = [...assessmentScores]
                          newScores[index] = parseInt(value)
                          setAssessmentScores(newScores)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Not at all</SelectItem>
                          <SelectItem value="1">Several days</SelectItem>
                          <SelectItem value="2">More than half the days</SelectItem>
                          <SelectItem value="3">Nearly every day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {assessmentType === 'GAD-7' && (
                <div className="space-y-4">
                  <h3 className="font-medium">Over the last 2 weeks, how often have you been bothered by:</h3>
                  {GAD7_QUESTIONS.map((question, index) => (
                    <div key={index} className="space-y-2">
                      <p className="text-sm">{index + 1}. {question}</p>
                      <Select
                        value={assessmentScores[index]?.toString() || ''}
                        onValueChange={(value) => {
                          const newScores = [...assessmentScores]
                          newScores[index] = parseInt(value)
                          setAssessmentScores(newScores)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Not at all</SelectItem>
                          <SelectItem value="1">Several days</SelectItem>
                          <SelectItem value="2">More than half the days</SelectItem>
                          <SelectItem value="3">Nearly every day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                onClick={submitAssessment}
                disabled={assessmentScores.length < (assessmentType === 'PHQ-9' ? 9 : 7)}
                className="w-full"
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Submit Assessment
              </Button>

              {assessmentResult && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium mb-2">Assessment Result</h3>
                  <p className="mb-2">Result: <strong>{assessmentResult.result}</strong></p>
                  <p className="text-sm text-gray-600 mb-3">
                    Risk Level: <Badge variant={assessmentResult.riskLevel === 'high' ? 'destructive' : 'secondary'}>
                      {assessmentResult.riskLevel}
                    </Badge>
                  </p>
                  <p className="text-sm">
                    Based on your results, we recommend {assessmentResult.riskLevel === 'high' ? 'speaking with a counsellor soon' : 'continuing to monitor your mental health and using our resources'}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}