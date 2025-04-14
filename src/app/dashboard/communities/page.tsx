'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Community Dashboard</h1>
      <Tabs defaultValue="create" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Create Community</TabsTrigger>
          <TabsTrigger value="manage">Manage Communities</TabsTrigger>
          <TabsTrigger value="setup">Component Plugin</TabsTrigger>
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
                          <span className="text-sm text-muted-foreground">
                            ng.games/{community.referralGame}/{community.referralSlug}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`ng.games/${community.referralGame}/${community.referralSlug}`);
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
                              setIsEditingDetails(true);
                            }}
                          >
                            Edit
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

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Community Component Plugin</CardTitle>
              <CardDescription>Add community functionality to your game</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <h3 className="mb-2 text-sm font-medium">Installation</h3>
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                    npm install @boredgamer/communities
                  </code>
                </div>

                <div className="rounded-md bg-muted p-4">
                  <h3 className="mb-2 text-sm font-medium">Usage</h3>
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                    import &#123; CommunityManager &#125; from &apos;@boredgamer/communities&apos;;
                  </code>
                </div>

                <div className="rounded-md bg-muted p-4">
                  <h3 className="mb-2 text-sm font-medium">Example</h3>
                  <pre className="text-sm">
                    <code>
                      {`const community = new CommunityManager({
  apiKey: 'your-api-key',
  gameId: 'your-game-id'
});

// Get community details
const communityDetails = await community.get('community-id');

// Join community
await community.join({
  communityId: 'community-id',
  userId: 'user-id'
});

// Post to community
await community.createPost({
  communityId: 'community-id',
  userId: 'user-id',
  content: 'Hello community!'
});`}
                    </code>
                  </pre>
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
    </div>
  );
}
