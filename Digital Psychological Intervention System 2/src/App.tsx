import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { toast } from 'sonner@2.0.3'
import StudentDashboard from './components/student-dashboard'
import CounsellorDashboard from './components/counsellor-dashboard'
import AdminDashboard from './components/admin-dashboard'
import { projectId, publicAnonKey } from './utils/supabase/info'

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
)

interface User {
  id: string
  email: string
  name: string
  role: 'student' | 'counsellor' | 'admin'
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Auth form states
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'student' | 'counsellor' | 'admin'>('student')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (session?.access_token) {
        setAccessToken(session.access_token)
        await fetchUserProfile(session.access_token)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setLoading(false)
    }
  }

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { profile } = await response.json()
        setUser(profile)
      } else {
        console.error('Failed to fetch profile')
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5bd9e6fb/signup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name, role })
      })

      if (response.ok) {
        toast.success('Account created successfully! Please sign in.')
        setIsLogin(true)
        setEmail('')
        setPassword('')
        setName('')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create account')
      }
    } catch (error) {
      console.error('Signup error:', error)
      toast.error('Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (data.session?.access_token) {
        setAccessToken(data.session.access_token)
        await fetchUserProfile(data.session.access_token)
        toast.success('Signed in successfully!')
      } else {
        toast.error(error?.message || 'Failed to sign in')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setAccessToken(null)
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Failed to sign out')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Mental Health Support System</CardTitle>
            <CardDescription>
              Digital platform for psychological intervention and support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'signup'} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" onClick={() => setIsLogin(true)}>
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" onClick={() => setIsLogin(false)}>
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <Button onClick={handleSignIn} className="w-full" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(value: 'student' | 'counsellor' | 'admin') => setRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="counsellor">Counsellor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSignUp} className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Mental Health Support - {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.name}</span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {user.role === 'student' && <StudentDashboard user={user} accessToken={accessToken} />}
        {user.role === 'counsellor' && <CounsellorDashboard user={user} accessToken={accessToken} />}
        {user.role === 'admin' && <AdminDashboard user={user} accessToken={accessToken} />}
      </main>
    </div>
  )
}