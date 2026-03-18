'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { getCurrentCustomerProfile, updateCustomerProfile } from '@/lib/api/customer'
import { useRouter } from 'next/navigation'

interface CustomerProfile {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  user_type: number
  is_verified: boolean
  is_active: boolean
  created_at: string
}

export default function CustomerProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<CustomerProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getCurrentCustomerProfile()
         // Debug log to see actual structure
        
        // Handle the actual API response structure
        if (data && data.first_name) {
          setProfileData(data)
          setEditForm({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone: data.phone || ''
          })
        } else {
          
          setError('Invalid profile data structure')
        }
      } catch (error) {
        
        setError('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [user])

  const handleEditProfile = () => {
    if (editing) {
      // Save changes
      const saveProfile = async () => {
        try {
          await updateCustomerProfile(editForm)
          // Reload profile data
          const data = await getCurrentCustomerProfile()
          setProfileData(data)
          setEditing(false)
        } catch (error) {
          
          setError('Failed to update profile')
        }
      }
      saveProfile()
    } else {
      setEditing(true)
    }
  }

  const handleChangePassword = () => {
    // Navigate to change password page or open modal
    router.push('/customer/settings/password')
  }

  const handleDownloadStatement = () => {
    // Navigate to statements page
    router.push('/customer/statements')
  }

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCancelEdit = () => {
    setEditing(false)
    // Reset form to original values
    if (profileData) {
      setEditForm({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone || ''
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const fullName = profileData 
    ? `${profileData.first_name} ${profileData.last_name}`.trim()
    : user.name || 'Customer User'

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
              {editing && (
                <button
                  onClick={handleCancelEdit}
                  className="text-sm px-3 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                {editing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="First name"
                    />
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Last name"
                    />
                  </div>
                ) : (
                  <p className="text-gray-900 py-2">{fullName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <p className="text-gray-900 py-2">{profileData?.email || user.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                {editing ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+233 20 123 4567"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{profileData?.phone || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                <p className="text-gray-900 py-2">
                  {profileData?.created_at 
                    ? new Date(profileData.created_at).toLocaleDateString()
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Account Status */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Account Status</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <p className="text-gray-900 py-2">Customer Account</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  profileData?.is_verified 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {profileData?.is_verified ? 'VERIFIED' : 'NOT VERIFIED'}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  profileData?.is_active 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {profileData?.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button 
            onClick={handleEditProfile}
            className="w-full sm:w-auto px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {editing ? 'Save Changes' : 'Edit Profile'}
          </button>
          <button 
            onClick={handleChangePassword}
            className="w-full sm:w-auto px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Change Password
          </button>
          <button 
            onClick={handleDownloadStatement}
            className="w-full sm:w-auto px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:col-span-2 lg:col-span-1"
          >
            Download Statement
          </button>
        </div>
      </div>
    </div>
  )
}

