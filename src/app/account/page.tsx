'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth/auth-context';
import { updateEmail, updatePassword, getAuth } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import 'src/app/account/account.css';
import 'src/app/dashboard/communities/communities.css';

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const auth = getAuth();
  const router = useRouter();

  const [loading, setLoading] = useState({
    email: false,
    password: false,
    studioName: false
  });

  const [formData, setFormData] = useState({
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    studioName: user?.name || '',
  });

  const handleEmailUpdate = async () => {
    if (!auth.currentUser) return;
    
    setLoading(prev => ({ ...prev, email: true }));
    try {
      await updateEmail(auth.currentUser, formData.email);
      await updateDoc(doc(db, 'studios', user!.id), {
        email: formData.email,
      });
      
      toast({
        title: 'Success',
        description: 'Email updated successfully',
      });
    } catch (error) {
      console.error('Error updating email:', error);
      toast({
        title: 'Error',
        description: 'Failed to update email. You may need to sign in again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, email: false }));
    }
  };

  const handlePasswordUpdate = async () => {
    if (!auth.currentUser) return;
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setLoading(prev => ({ ...prev, password: true }));
    try {
      await updatePassword(auth.currentUser, formData.newPassword);
      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: 'Error',
        description: 'Failed to update password. You may need to sign in again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  return (
    <div className="account-container">
      <Button
        variant="outline"
        size="sm"
        type="button"
        className="account-button"
        onClick={() => router.push('/dashboard')}
      >
        <ArrowLeft />
        To Dashboard
      </Button>

      <div className="account-header">
        <h1 style={{ color: 'white' }}>Account Settings</h1>
      </div>
      
      <div className="space-y-6">
        {/* Studio Name */}
        <Card className="account-card">
          <CardHeader className="account-card-header">
            <CardTitle>Studio Name</CardTitle>
            <CardDescription>Update your studio name</CardDescription>
          </CardHeader>
          <CardContent className="account-card-content" style={{ minHeight: 'fit-content' }}>
            <div className="space-y-2">
              <Label htmlFor="studio-name" style={{ marginRight: '0.5rem' }}>Studio Name</Label>
              <input
                id="studio-name"
                type="text"
                className="input w-full"
                value={formData.studioName}
                onChange={(e) => setFormData(prev => ({ ...prev, studioName: e.target.value }))}
              />
            </div>
            <Button 
              className="update-button"
              onClick={async () => {
                if (!user?.id || formData.studioName.trim() === '') {
                  toast({
                    title: 'Error',
                    description: 'Please enter a valid studio name',
                    variant: 'destructive'
                  });
                  return;
                }
                
                setLoading(prev => ({ ...prev, studioName: true }));
                try {
                  const studioRef = doc(db, 'studios', user.id);
                  
                  // First check if the studio document exists
                  const studioDoc = await getDoc(studioRef);
                  if (!studioDoc.exists()) {
                    throw new Error('Studio document not found');
                  }

                  // Update both documents
                  const updates = {
                    name: formData.studioName.trim(),
                    updatedAt: new Date().toISOString()
                  };

                  await Promise.all([
                    updateDoc(studioRef, updates),
                    // Also update users collection if it exists
                    getDoc(doc(db, 'users', user.id)).then(userDoc => {
                      if (userDoc.exists()) {
                        return updateDoc(doc(db, 'users', user.id), updates);
                      }
                    })
                  ]);

                  // Update local state
                  if (user) {
                    user.name = formData.studioName.trim();
                  }

                  toast({
                    title: 'Success',
                    description: 'Studio name updated successfully',
                  });
                } catch (error: any) {
                  console.error('Error updating studio name:', error);
                  toast({
                    title: 'Error',
                    description: error.message || 'Failed to update studio name. Please try again.',
                    variant: 'destructive'
                  });
                } finally {
                  setLoading(prev => ({ ...prev, studioName: false }));
                }
              }}
              disabled={loading.studioName || formData.studioName.trim() === '' || formData.studioName === user?.name}
            >
              {loading.studioName ? 'Updating...' : 'Update Studio Name'}
            </Button>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card className="account-card">
          <CardHeader className="account-card-header">
            <CardTitle>Email Settings</CardTitle>
            <CardDescription>Update your email address</CardDescription>
          </CardHeader>
          <CardContent className="account-card-content" style={{ minHeight: 'fit-content' }}>
            <div className="space-y-2">
              <Label htmlFor="email" style={{ marginRight: '0.5rem' }}>Email Address</Label>
              <input
                id="email"
                type="email"
                className="input w-full"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <Button 
              className="update-button"
              onClick={handleEmailUpdate}
              disabled={loading.email || formData.email === user?.email}

            >
              {loading.email ? 'Updating...' : 'Update Email'}
            </Button>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card className="account-card">
          <CardHeader className="account-card-header">
            <CardTitle>Password Settings</CardTitle>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent className="account-card-content" style={{ minHeight: 'fit-content' }}>
            <div className="space-y-2">
              <Label htmlFor="current-password" style={{ marginRight: '0.5rem' }}>Current Password</Label>
              <input
                id="current-password"
                type="password"
                className="input w-full"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" style={{ marginRight: '0.5rem' }}>New Password</Label>
              <input
                id="new-password"
                type="password"
                className="input w-full"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" style={{ marginRight: '0.5rem' }}>Confirm New Password</Label>
              <input
                id="confirm-password"
                type="password"
                className="input w-full"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
            <Button 
              className="update-button"
              onClick={handlePasswordUpdate}
              disabled={loading.password || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}

            >
              {loading.password ? 'Updating...' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>

        {/* Subscription Settings */}
        <Card className="account-card">
          <CardHeader className="account-card-header">
            <CardTitle>Subscription Settings</CardTitle>
            <CardDescription>Manage your subscription and billing</CardDescription>
          </CardHeader>
          <CardContent className="account-card-content" style={{ minHeight: 'fit-content' }}>
            <div className="subscription-info">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold capitalize">{user?.tier} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    {user?.tier === 'independent' ? 'Free tier with basic features' : 'Premium features included'}
                  </p>
                </div>
                <Button className="update-button" variant="outline">
                  {user?.tier === 'independent' ? 'Upgrade Plan' : 'Manage Subscription'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
