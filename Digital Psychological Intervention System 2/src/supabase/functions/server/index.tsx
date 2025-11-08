import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js'
import * as kv from './kv_store.tsx'

const app = new Hono()

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))
app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// User signup route
app.post('/make-server-5bd9e6fb/signup', async (c) => {
  try {
    const { email, password, name, role } = await c.req.json()
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    })

    if (error) {
      console.log('Signup error:', error)
      return c.json({ error: error.message }, 400)
    }

    // Store user profile
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email: data.user.email,
      name,
      role,
      created_at: new Date().toISOString()
    })

    return c.json({ user: data.user })
  } catch (error) {
    console.log('Signup server error:', error)
    return c.json({ error: 'Internal server error during signup' }, 500)
  }
})

// Get user profile
app.get('/make-server-5bd9e6fb/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`user:${user.id}`)
    return c.json({ profile })
  } catch (error) {
    console.log('Profile fetch error:', error)
    return c.json({ error: 'Failed to fetch profile' }, 500)
  }
})

// Save chat message and risk assessment
app.post('/make-server-5bd9e6fb/chat', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { message, isUser, riskLevel } = await c.req.json()
    
    const chatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      message,
      isUser,
      riskLevel: riskLevel || null,
      timestamp: new Date().toISOString()
    }

    // Store chat message
    const chatKey = `chat:${user.id}:${Date.now()}`
    await kv.set(chatKey, chatMessage)

    // If high risk or crisis, create automatic appointment
    if (riskLevel === 'crisis' || riskLevel === 'high') {
      const counsellors = await kv.getByPrefix('user:')
      const counsellorProfiles = counsellors.filter(profile => profile.role === 'counsellor')
      
      if (counsellorProfiles.length > 0) {
        const appointment = {
          id: crypto.randomUUID(),
          studentId: user.id,
          counsellorId: counsellorProfiles[0].id,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next day
          time: '10:00',
          status: 'auto-scheduled',
          riskLevel,
          created_at: new Date().toISOString()
        }
        
        await kv.set(`appointment:${appointment.id}`, appointment)
        await kv.set(`student-appointment:${user.id}:${appointment.id}`, appointment)
        await kv.set(`counsellor-appointment:${counsellorProfiles[0].id}:${appointment.id}`, appointment)
      }
    }

    // Store analytics data
    const analyticsKey = `analytics:risk:${new Date().toISOString().split('T')[0]}`
    const existingAnalytics = await kv.get(analyticsKey) || { low: 0, moderate: 0, high: 0, crisis: 0 }
    if (riskLevel) {
      existingAnalytics[riskLevel] = (existingAnalytics[riskLevel] || 0) + 1
      await kv.set(analyticsKey, existingAnalytics)
    }

    return c.json({ success: true, chatMessage })
  } catch (error) {
    console.log('Chat save error:', error)
    return c.json({ error: 'Failed to save chat message' }, 500)
  }
})

// Get chat history
app.get('/make-server-5bd9e6fb/chat/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = c.req.param('userId')
    const chatMessages = await kv.getByPrefix(`chat:${userId}:`)
    
    return c.json({ messages: chatMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) })
  } catch (error) {
    console.log('Chat history fetch error:', error)
    return c.json({ error: 'Failed to fetch chat history' }, 500)
  }
})

// Book appointment
app.post('/make-server-5bd9e6fb/appointment', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { counsellorId, date, time } = await c.req.json()
    
    const appointment = {
      id: crypto.randomUUID(),
      studentId: user.id,
      counsellorId,
      date,
      time,
      status: 'scheduled',
      created_at: new Date().toISOString()
    }

    await kv.set(`appointment:${appointment.id}`, appointment)
    await kv.set(`student-appointment:${user.id}:${appointment.id}`, appointment)
    await kv.set(`counsellor-appointment:${counsellorId}:${appointment.id}`, appointment)

    return c.json({ success: true, appointment })
  } catch (error) {
    console.log('Appointment booking error:', error)
    return c.json({ error: 'Failed to book appointment' }, 500)
  }
})

// Get appointments for user
app.get('/make-server-5bd9e6fb/appointments', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`user:${user.id}`)
    let appointments = []

    if (profile.role === 'student') {
      appointments = await kv.getByPrefix(`student-appointment:${user.id}:`)
    } else if (profile.role === 'counsellor') {
      appointments = await kv.getByPrefix(`counsellor-appointment:${user.id}:`)
    }

    return c.json({ appointments })
  } catch (error) {
    console.log('Appointments fetch error:', error)
    return c.json({ error: 'Failed to fetch appointments' }, 500)
  }
})

// Forum post
app.post('/make-server-5bd9e6fb/forum', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { content, category } = await c.req.json()
    
    // TODO: ML/DL content filtering and risk assessment integration point
    // const contentAnalysis = await analyzeContent(content)
    // const riskLevel = await assessRisk(content)
    
    const post = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: (await kv.get(`user:${user.id}`)).name,
      content,
      category,
      timestamp: new Date().toISOString(),
      replies: []
    }

    await kv.set(`forum:${post.id}`, post)

    return c.json({ success: true, post })
  } catch (error) {
    console.log('Forum post error:', error)
    return c.json({ error: 'Failed to create forum post' }, 500)
  }
})

// Get forum posts
app.get('/make-server-5bd9e6fb/forum', async (c) => {
  try {
    const posts = await kv.getByPrefix('forum:')
    return c.json({ posts: posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) })
  } catch (error) {
    console.log('Forum posts fetch error:', error)
    return c.json({ error: 'Failed to fetch forum posts' }, 500)
  }
})

// Reply to forum post
app.post('/make-server-5bd9e6fb/forum/:postId/reply', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const postId = c.req.param('postId')
    const { content } = await c.req.json()
    
    const post = await kv.get(`forum:${postId}`)
    if (!post) {
      return c.json({ error: 'Post not found' }, 404)
    }

    const reply = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: (await kv.get(`user:${user.id}`)).name,
      content,
      timestamp: new Date().toISOString()
    }

    post.replies.push(reply)
    await kv.set(`forum:${postId}`, post)

    return c.json({ success: true, reply })
  } catch (error) {
    console.log('Forum reply error:', error)
    return c.json({ error: 'Failed to reply to post' }, 500)
  }
})

// Self assessment
app.post('/make-server-5bd9e6fb/assessment', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { type, scores, responses } = await c.req.json()
    
    let result = ''
    let riskLevel = 'low'
    
    // PHQ-9 Depression Assessment
    if (type === 'PHQ-9') {
      const total = scores.reduce((sum: number, score: number) => sum + score, 0)
      if (total <= 4) {
        result = 'Minimal Depression'
        riskLevel = 'low'
      } else if (total <= 9) {
        result = 'Mild Depression'
        riskLevel = 'low'
      } else if (total <= 14) {
        result = 'Moderate Depression'
        riskLevel = 'moderate'
      } else if (total <= 19) {
        result = 'Moderately Severe Depression'
        riskLevel = 'high'
      } else {
        result = 'Severe Depression'
        riskLevel = 'crisis'
      }
    }
    
    // GAD-7 Anxiety Assessment
    if (type === 'GAD-7') {
      const total = scores.reduce((sum: number, score: number) => sum + score, 0)
      if (total <= 4) {
        result = 'Minimal Anxiety'
        riskLevel = 'low'
      } else if (total <= 9) {
        result = 'Mild Anxiety'
        riskLevel = 'low'
      } else if (total <= 14) {
        result = 'Moderate Anxiety'
        riskLevel = 'moderate'
      } else {
        result = 'Severe Anxiety'
        riskLevel = 'high'
      }
    }

    const assessment = {
      id: crypto.randomUUID(),
      userId: user.id,
      type,
      scores,
      responses,
      result,
      riskLevel,
      timestamp: new Date().toISOString()
    }

    await kv.set(`assessment:${user.id}:${assessment.id}`, assessment)

    // Store analytics data
    const analyticsKey = `analytics:assessment:${new Date().toISOString().split('T')[0]}`
    const existingAnalytics = await kv.get(analyticsKey) || {}
    existingAnalytics[type] = (existingAnalytics[type] || 0) + 1
    await kv.set(analyticsKey, existingAnalytics)

    return c.json({ success: true, assessment })
  } catch (error) {
    console.log('Assessment save error:', error)
    return c.json({ error: 'Failed to save assessment' }, 500)
  }
})

// Get analytics data (admin only)
app.get('/make-server-5bd9e6fb/analytics', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const profile = await kv.get(`user:${user.id}`)
    if (profile.role !== 'admin') {
      return c.json({ error: 'Access denied - Admin only' }, 403)
    }

    // Get risk analytics
    const riskAnalytics = await kv.getByPrefix('analytics:risk:')
    const assessmentAnalytics = await kv.getByPrefix('analytics:assessment:')
    
    // Get all users count by role
    const allUsers = await kv.getByPrefix('user:')
    const usersByRole = allUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})

    // Get total appointments
    const appointments = await kv.getByPrefix('appointment:')
    
    return c.json({
      riskAnalytics,
      assessmentAnalytics,
      usersByRole,
      totalAppointments: appointments.length,
      totalUsers: allUsers.length
    })
  } catch (error) {
    console.log('Analytics fetch error:', error)
    return c.json({ error: 'Failed to fetch analytics' }, 500)
  }
})

// Get counsellors list
app.get('/make-server-5bd9e6fb/counsellors', async (c) => {
  try {
    const allUsers = await kv.getByPrefix('user:')
    const counsellors = allUsers.filter(user => user.role === 'counsellor')
    return c.json({ counsellors })
  } catch (error) {
    console.log('Counsellors fetch error:', error)
    return c.json({ error: 'Failed to fetch counsellors' }, 500)
  }
})

Deno.serve(app.fetch)