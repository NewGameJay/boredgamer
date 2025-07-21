'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AnalyticsLineChart,
  AnalyticsPieChartLinks,
  AnalyticsPieChartCommunity,
  AnalyticsPieChartReferee,
  AnalyticsBarChartReferrer
} from './analytics-charts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, addDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import '@/app/dashboard/quests/quests.css';
import '@/app/dashboard/communities/communities.css';

interface Community {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private';
  referee: 'guild' | 'creator' | 'individual' | 'partner';
  platform: 'pc' | 'console' | 'mobile';
  rules: string[];
  rewards: {
    type: string;
    amount: number;
    metadata?: Record<string, any>;
  }[];
  memberCount: number;
  studioId: string;
  createdAt: string;
  visitCount: number;
  lastVisitedAt?: string;
  status: 'active' | 'archived';
  referralGame: string;
  referralSlug: string;
  referralDestination: string;
}

interface Reward {
  type: string;
  amount: number;
  metadata?: Record<string, any>;
}

interface IdentifiedUser {
  userId: string;
  identifier: string;
  timestamp: string;
  referee: string;
}

interface FormData {
  name: string;
  description: string;
  type: 'public' | 'private';
  referee: 'guild' | 'creator' | 'individual' | 'partner';
  platform: 'pc' | 'console' | 'mobile';
  rules: string[];
  referralGame: string;
  referralSlug: string;
  referralDestination: string;
  rewards: Reward[];
}

export default function CommunityDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isViewingIdentified, setIsViewingIdentified] = useState(false);
  const [identifiedUsers, setIdentifiedUsers] = useState<IdentifiedUser[]>([]);
  const [activeTab, setActiveTab] = useState('create');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'public',
    referee: 'guild',
    platform: 'pc',
    rules: [''],
    referralGame: '',
    referralSlug: '',
    referralDestination: '',
    rewards: [{ type: 'points', amount: 0 }]
  });
  const { toast } = useToast();

  const loadCommunities = useCallback(async () => {
    if (!user?.id || !user.features?.communities) {
      console.log('No user ID available or no access to communities feature');
      return;
    }

    try {
      console.log('Loading communities for user:', user.id);
      const q = query(
        collection(db, 'communities'),
        where('studioId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      console.log('Query snapshot size:', querySnapshot.size);
      const communitiesData: Community[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Community, 'id'>;
        console.log('Community data:', data);
        communitiesData.push({
          id: doc.id,
          ...data,
        });
      });

      console.log('Setting communities:', communitiesData);
      setCommunities(communitiesData);
    } catch (error) {
      console.error('Error loading communities:', error);
      toast({
        title: "Error",
        description: "Failed to load communities",
        variant: "destructive",
      });
    }
  }, [user?.id, toast]);

  useEffect(() => {
    console.log('Current user state:', {
      id: user?.id,
      features: user?.features,
      hasCommunities: user?.features?.communities
    });
    if (user) {
      loadCommunities();
    }

    // Additional log: Check communities with studioId related to user after load
    // This will require another effect to watch communities
    // (add below, outside this effect)

  }, [user, loadCommunities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a community.",
        variant: "destructive"
      });
      return;
    }

    try {
      const communitiesRef = collection(db, 'communities');
      const newCommunity = {
        ...formData,
        studioId: user.id,
        createdAt: new Date().toISOString(),
        memberCount: 0,
        visitCount: 0,
        status: 'active' as const
      };

      await addDoc(communitiesRef, newCommunity);

      toast({
        title: "Success",
        description: "Community created successfully!",
      });

      setFormData({
        name: '',
        description: '',
        type: 'public',
        referee: 'guild',
        platform: 'pc',
        rules: [''],
        referralGame: '',
        referralSlug: '',
        referralDestination: '',
        rewards: [{ type: 'points', amount: 0 }]
      });

      loadCommunities();
      setActiveTab('manage');
    } catch (error) {
      console.error('Error creating community:', error);
      toast({
        title: "Error",
        description: "Failed to create community",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCommunity = async (communityId: string, updates: Partial<Community>) => {
    try {
      await setDoc(doc(db, 'communities', communityId), updates, { merge: true });
      toast({
        title: "Success",
        description: "Community updated successfully",
      });
      loadCommunities();
    } catch (error) {
      console.error('Error updating community:', error);
      toast({
        title: "Error",
        description: "Failed to update community",
        variant: "destructive",
      });
    }
  };

  const fetchIdentifiedUsers = async (communityId: string) => {
    try {
      const response = await fetch(`/api/v1/identify?communityId=${communityId}`);
      const data = await response.json();
      
      if (data.success) {
        const users: IdentifiedUser[] = data.referrals.map((referral: any) => ({
          userId: referral.userId,
          identifier: referral.metadata?.username || referral.userId,
          timestamp: referral.identifiedAt || referral.createdAt,
          referee: referral.referee || 'direct'
        }));
        
        setIdentifiedUsers(users);
        setIsViewingIdentified(true);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching identified users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch identified users",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCommunity = async (communityId: string) => {
    try {
      await deleteDoc(doc(db, 'communities', communityId));
      toast({
        title: "Success",
        description: "Community deleted successfully",
      });
      loadCommunities();
      setIsConfirmingDelete(false);
    } catch (error) {
      console.error('Error deleting community:', error);
      toast({
        title: "Error",
        description: "Failed to delete community",
        variant: "destructive",
      });
    }
  };

  // Log communities with studioId matching user after communities load
  useEffect(() => {
    if (user?.id && communities.length > 0) {
      const userCommunities = communities.filter(c => c.studioId === user.id);
      console.log('[Communities Feature] Loaded communities with studioId matching user:', userCommunities);
    }
  }, [user?.id, communities]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Community Dashboard</h1>
      <Tabs defaultValue="create" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Create Community</TabsTrigger>
          <TabsTrigger value="manage">Manage Communities</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="identification">Identification Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Community</CardTitle>
              <CardDescription>Set up a new community for your game</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Community Name</Label>
                    <input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter community name"
                      required
                      className="input w-full"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Internal Description</Label>
                    <input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter community description"
                      required
                      className="input w-full h-24"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="referralGame">Referral Link</Label>
                    <div className="flex gap-2 items-center" style={{ display: 'flex', flexDirection: 'row' }}>
                      <span className="text-sm text-muted-foreground">ng.games /</span>
                      <input
                        id="referralGame"
                        value={formData.referralGame}
                        onChange={(e) => {
                          const game = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                          setFormData({ ...formData, referralGame: game });
                        }}
                        placeholder="game-name"
                        required
                        className="input w-[150px] slug-input"
                      />
                      <span className="text-sm text-muted-foreground">/</span>
                      <input
                        id="referralSlug"
                        value={formData.referralSlug}
                        onChange={(e) => {
                          const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                          setFormData({ ...formData, referralSlug: slug });
                        }}
                        placeholder="community-name"
                        required
                        className="input w-full slug-input"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Your community will be accessible at: ng.games/{formData.referralGame}/{formData.referralSlug}</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="name">URL Destination</Label>
                    <input
                      id="name"
                      value={formData.referralDestination}
                      onChange={(e) => setFormData({ ...formData, referralDestination: e.target.value })}
                      placeholder="Enter URL destination"
                      required
                      className="input w-full"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="type">Community Categories</Label>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
                    <select
                      id="type"
                      className="input w-full"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'public' | 'private' })}
                    >
                      <option value="public">Public (Anyone can follow the URL) </option>
                      <option value="private">Private (Users will have to confirm their email or Discord)</option>
                    </select>      
                    <select
                      id="referee"
                      className="input w-full"
                      value={formData.referee}
                      onChange={(e) => setFormData({ ...formData, referee: e.target.value as 'guild' | 'creator' | 'individual' | 'partner' })}
                    >
                      <option value="guild">Guild </option>
                      <option value="creator">Creator </option>
                      <option value="individual">Individual </option>
                      <option value="partner">Game Partner </option>
                    </select>                    <select
                      id="platform"
                      className="input w-full"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value as 'pc' | 'console' | 'mobile' })}
                    >
                      <option value="pc">PC </option>
                      <option value="console">Console </option>
                      <option value="mobile">Mobile </option>
                    </select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Community Bundles</Label>
                    {formData.rewards.map((reward, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          value={reward.type}
                          onChange={(e) => {
                            const newRewards = [...formData.rewards];
                            newRewards[index] = { ...reward, type: e.target.value };
                            setFormData({ ...formData, rewards: newRewards });
                          }}
                          className="input w-[200px]"
                        />
                        <input
                          type="number"
                          value={reward.amount}
                          onChange={(e) => {
                            const newRewards = [...formData.rewards];
                            newRewards[index] = { ...reward, amount: parseInt(e.target.value) || 0 };
                            setFormData({ ...formData, rewards: newRewards });
                          }}
                          placeholder="Amount"
                          className="input w-[150px]"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          className="mt-2"
                          style={{ marginTop: '0.5rem' }}

                          onClick={() => {
                            const newRewards = formData.rewards.filter((_, i) => i !== index);
                            setFormData({ ...formData, rewards: newRewards });
                          }}
                        >
                          Remove Reward
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          rewards: [...formData.rewards, { type: 'points', amount: 0 }]
                        });
                      }}
                    >
                      Add Reward
                    </Button>
                  </div>
                </div>

                <Button type="submit">Create Community</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Manage Communities</CardTitle>
              <CardDescription>View and manage your game communities</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="communities-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Referral Link</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communities.map((community) => (
                    <TableRow key={community.id}>
                      <TableCell className="font-medium">{community.name}</TableCell>
                      <TableCell>{community.type}</TableCell>
                      <TableCell>{community.referee}</TableCell>
                      <TableCell>{community.platform}</TableCell>
                      <TableCell>{community.visitCount || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <a
  className="text-sm text-blue-600 underline hover:text-blue-800 cursor-pointer"
  href={`https://ng.games/${community.referralGame}/${community.referralSlug}`}
  target="_blank"
  rel="noopener noreferrer"
>
  ng.games/{community.referralGame}/{community.referralSlug}
</a>
<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    navigator.clipboard.writeText(`https://ng.games/${community.referralGame}/${community.referralSlug}`);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  }}
>
  Copy
</Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCommunity(community);
                              fetchIdentifiedUsers(community.id);
                            }}
                          >
                            Manage
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedCommunity(community);
                              setIsConfirmingDelete(true);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
  <Card>
    <CardHeader>
      <CardTitle>Live Analytics</CardTitle>
      <CardDescription>Track community referral link performance in real time</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-8">
        {/* Line Chart: Total Clicks Over Time (Simulated as visitCount for now) */}
        <div className="rounded-md bg-muted p-4">
          <h3 className="mb-2 text-sm font-medium">Total Clicks (All Links)</h3>
          <AnalyticsLineChart communities={communities} />
        </div>
        {/* Pie Chart: Most Clicked Links */}
        <div className="rounded-md bg-muted p-4">
          <h3 className="mb-2 text-sm font-medium">Most Clicked Links</h3>
          <AnalyticsPieChartLinks communities={communities} />
        </div>
        {/* Pie Chart: By Community Name */}
        <div className="rounded-md bg-muted p-4">
          <h3 className="mb-2 text-sm font-medium">Clicks by Community</h3>
          <AnalyticsPieChartCommunity communities={communities} />
        </div>
        {/* Pie Chart: By Referee */}
        <div className="rounded-md bg-muted p-4">
          <h3 className="mb-2 text-sm font-medium">Clicks by Referee</h3>
          <AnalyticsPieChartReferee communities={communities} />
        </div>
        {/* Bar Chart: By Referrer (Placeholder, needs backend tracking) */}
        <div className="rounded-md bg-muted p-4">
          <h3 className="mb-2 text-sm font-medium">Clicks by Referrer</h3>
          <AnalyticsBarChartReferrer />
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>

        <TabsContent value="identification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identification Setup Guide</CardTitle>
              <CardDescription>Follow these steps to implement user identification in your game</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Step 1: Referral Token */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Step 1: Handle Referral Token</h3>
                  <p className="text-sm text-muted-foreground">
                    When users click your referral link (ng.games/game-name/community-name), they'll be redirected to your game with a referral token. The token will be included in the URL parameters. 
                    The URL will look like this:
                  </p>
                  <div className="bg-muted p-4 rounded-md">
                    <code className="text-sm">
                      https://yourgame.com/register?referralToken=community-name
                    </code>
                  </div>
                </div>

                {/* Step 2: API Implementation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Step 2: Implement API Endpoint</h3>
                  <p className="text-sm text-muted-foreground">
                    Create an API endpoint in your game to receive the user identifier after successful registration/login.
                    Send this data to our API:
                  </p>
                  <div className="bg-muted p-4 rounded-md space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Endpoint:</p>
                      <code className="text-sm">
                        POST https://api.boredgamer.com/v1/identify
                      </code>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Request Body:</p>
                      <pre className="text-sm">
{`{
  "referralToken": "xyz123",
  "userId": "player_unique_id",
  "gameId": "your_game_id",
  "metadata": {
    // Optional additional user data
    "username": "player_username",
    "joinedAt": "2025-04-21T20:05:23Z"
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Step 3: Code Example */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Step 3: Implementation Example</h3>
                  <p className="text-sm text-muted-foreground">
                    Here's a code example showing how to implement the identification flow:
                  </p>
                  <div className="bg-muted p-4 rounded-md">
                    <pre className="text-sm">
{`// 1. Get referral token from URL
const params = new URLSearchParams(window.location.search);
const referralToken = params.get('referralToken');

// 2. After user signs up/logs in, send identification
async function identifyUser(userId, username) {
  try {
    const response = await fetch('https://api.boredgamer.com/v1/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
      },
      body: JSON.stringify({
        referralToken,
        userId,
        gameId: 'your_game_id',
        metadata: {
          username,
          joinedAt: new Date().toISOString()
        }
      })
    });
    
    const data = await response.json();
    console.log('User identified:', data);
  } catch (error) {
    console.error('Error identifying user:', error);
  }
}`}
                    </pre>
                  </div>
                </div>

                {/* Step 4: Testing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Step 4: Testing</h3>
                  <p className="text-sm text-muted-foreground">
                    Test your implementation using these steps:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Create a test community and get a referral link</li>
                    <li>Click the referral link to go to your game</li>
                    <li>Sign up/log in a test user</li>
                    <li>Verify the identification API call is made</li>
                    <li>Check the Analytics tab to see if the conversion is tracked</li>
                  </ol>
                </div>

                {/* Need Help Section */}
                <div className="mt-8 p-4 bg-muted rounded-md">
                  <h3 className="text-sm font-semibold mb-2">Need Help?</h3>
                  <p className="text-sm text-muted-foreground">
                    Check out our <a href="/docs/api" className="text-primary hover:underline">API documentation</a> for 
                    detailed information or contact our support team at support@boredgamer.gg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <Dialog open={isEditingDetails} onOpenChange={setIsEditingDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Community Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={selectedCommunity?.name || ''}
                onChange={(e) => setSelectedCommunity(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={selectedCommunity?.description || ''}
                onChange={(e) => setSelectedCommunity(prev => prev ? { ...prev, description: e.target.value } : null)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <select
                id="edit-type"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedCommunity?.type || 'public'}
                onChange={(e) => setSelectedCommunity(prev => prev ? { ...prev, type: e.target.value as 'public' | 'private' } : null)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingDetails(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedCommunity) {
                handleUpdateCommunity(selectedCommunity.id, {
                  name: selectedCommunity.name,
                  description: selectedCommunity.description,
                  type: selectedCommunity.type
                });
                setIsEditingDetails(false);
              }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Community</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this community? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmingDelete(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedCommunity && handleDeleteCommunity(selectedCommunity.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewingIdentified} onOpenChange={setIsViewingIdentified}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Identified Users - {selectedCommunity?.name}</DialogTitle>
            <DialogDescription>
              Users who have been identified through this community's referral link
            </DialogDescription>
          </DialogHeader>
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identifier</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Referee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {identifiedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No identified users yet
                    </TableCell>
                  </TableRow>
                ) : (
                  identifiedUsers.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell>{user.identifier}</TableCell>
                      <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                      <TableCell>{new Date(user.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{user.referee}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewingIdentified(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
