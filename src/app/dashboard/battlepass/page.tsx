
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth/auth-context';

interface BattlePassTier {
  tier: number;
  xpRequired: number;
  freeRewards: Array<{
    type: 'coins' | 'items' | 'cosmetics' | 'experience';
    amount: number;
    metadata?: Record<string, any>;
  }>;
  premiumRewards: Array<{
    type: 'coins' | 'items' | 'cosmetics' | 'experience';
    amount: number;
    metadata?: Record<string, any>;
  }>;
}

interface BattlePass {
  id: string;
  name: string;
  description: string;
  season: number;
  startDate: string;
  endDate: string;
  maxTier: number;
  tiers: BattlePassTier[];
  isActive: boolean;
  premiumPrice: number;
  currency: string;
  accessType: 'public' | 'community_gated' | 'premium_only';
  requiredCommunity?: string;
  requiresVerification: boolean;
  xpSources: Array<{
    eventType: string;
    xpValue: number;
    description: string;
  }>;
}

interface PlayerProgress {
  playerId: string;
  battlePassId: string;
  currentTier: number;
  totalXP: number;
  hasPremium: boolean;
  claimedRewards: {
    tier: number;
    type: 'free' | 'premium';
    timestamp: string;
  }[];
}

export default function BattlePassPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [battlePass, setBattlePass] = useState<BattlePass | null>(null);
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testPlayerId, setTestPlayerId] = useState('test-player-123');
  const [selectedActivity, setSelectedActivity] = useState('match_completion');
  const [customXP, setCustomXP] = useState('');

  const [newBattlePass, setNewBattlePass] = useState({
    name: '',
    description: '',
    season: 1,
    startDate: '',
    endDate: '',
    maxTier: 100,
    premiumPrice: 9.99,
    currency: 'USD'
  });

  useEffect(() => {
    fetchBattlePass();
  }, []);

  const fetchBattlePass = async () => {
    try {
      const response = await fetch(`/api/battlepass?playerId=${testPlayerId}`, {
        headers: {
          'x-api-key': 'demo-api-key'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBattlePass(data.battlePass);
        setPlayerProgress(data.playerProgress);
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch battle pass:', error);
      toast({
        title: "Error",
        description: "Failed to load battle pass data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const grantXP = async () => {
    try {
      const requestBody: any = {
        playerId: testPlayerId,
        activity: selectedActivity
      };

      if (customXP) {
        requestBody.customXP = parseInt(customXP);
      }

      const response = await fetch('/api/battlepass/xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'demo-api-key'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "XP Granted!",
          description: `Gained ${result.xpGained} XP${result.tierUp ? ` - Tier Up to ${result.currentTier}!` : ''}`,
        });
        fetchBattlePass(); // Refresh data
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to grant XP:', error);
      toast({
        title: "Error",
        description: "Failed to grant XP",
        variant: "destructive"
      });
    }
  };

  const claimReward = async (tier: number, rewardType: 'free' | 'premium') => {
    try {
      const response = await fetch('/api/battlepass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'demo-api-key'
        },
        body: JSON.stringify({
          action: 'claim_reward',
          battlePassId: battlePass?.id,
          playerId: testPlayerId,
          tier,
          rewardType
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Reward Claimed!",
          description: `Claimed tier ${tier} ${rewardType} rewards`,
        });
        fetchBattlePass(); // Refresh data
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
    }
  };

  const purchasePremium = async () => {
    try {
      const response = await fetch('/api/battlepass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'demo-api-key'
        },
        body: JSON.stringify({
          action: 'purchase_premium',
          battlePassId: battlePass?.id,
          playerId: testPlayerId
        })
      });

      if (response.ok) {
        toast({
          title: "Premium Purchased!",
          description: "You now have access to premium rewards",
        });
        fetchBattlePass(); // Refresh data
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to purchase premium:', error);
    }
  };

  const createBattlePass = async () => {
    try {
      // Generate sample tiers
      const tiers: BattlePassTier[] = [];
      for (let i = 1; i <= newBattlePass.maxTier; i++) {
        tiers.push({
          tier: i,
          xpRequired: i * 1000, // 1000 XP per tier
          freeRewards: [
            { type: 'coins', amount: i * 100 }
          ],
          premiumRewards: [
            { type: 'coins', amount: i * 200 },
            ...(i % 10 === 0 ? [{ type: 'items', amount: 1, metadata: { itemId: `tier_${i}_reward` } }] : [])
          ]
        });
      }

      const response = await fetch('/api/battlepass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'demo-api-key'
        },
        body: JSON.stringify({
          action: 'create_battlepass',
          battlePass: {
            ...newBattlePass,
            tiers,
            isActive: true
          }
        })
      });

      if (response.ok) {
        toast({
          title: "Battle Pass Created!",
          description: "New battle pass is now active",
        });
        fetchBattlePass(); // Refresh data
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to create battle pass:', error);
    }
  };

  const isRewardClaimed = (tier: number, type: 'free' | 'premium') => {
    return playerProgress?.claimedRewards.some(r => r.tier === tier && r.type === type) || false;
  };

  const canClaimReward = (tier: number, type: 'free' | 'premium') => {
    if (!playerProgress) return false;
    if (playerProgress.currentTier < tier) return false;
    if (type === 'premium' && !playerProgress.hasPremium) return false;
    return !isRewardClaimed(tier, type);
  };

  if (loading) {
    return <div className="p-6">Loading battle pass...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Battle Pass System</h1>
          <p className="text-muted-foreground">
            Manage seasonal progression and rewards
          </p>
        </div>
      </div>

      <Tabs defaultValue="current" className="space-y-6">
        <TabsList>
          <TabsTrigger value="current">Current Battle Pass</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="testing">Testing Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {battlePass ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {battlePass.name}
                    <Badge variant={battlePass.isActive ? "default" : "secondary"}>
                      Season {battlePass.season}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{battlePass.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">{new Date(battlePass.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p className="font-medium">{new Date(battlePass.endDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Tier</p>
                      <p className="font-medium">{battlePass.maxTier}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Premium Price</p>
                      <p className="font-medium">${battlePass.premiumPrice}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {playerProgress && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Player Progress
                      <div className="flex items-center gap-2">
                        <Badge variant={playerProgress.hasPremium ? "default" : "outline"}>
                          {playerProgress.hasPremium ? "Premium" : "Free"}
                        </Badge>
                        {!playerProgress.hasPremium && (
                          <Button size="sm" onClick={purchasePremium}>
                            Upgrade to Premium
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Current Tier</p>
                        <p className="text-2xl font-bold">{playerProgress.currentTier}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total XP</p>
                        <p className="text-2xl font-bold">{playerProgress.totalXP.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rewards Claimed</p>
                        <p className="text-2xl font-bold">{playerProgress.claimedRewards.length}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Tier {playerProgress.currentTier}</span>
                        <span>Tier {Math.min(playerProgress.currentTier + 1, battlePass.maxTier)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${playerProgress.currentTier >= battlePass.maxTier ? 100 : 
                              Math.min(100, ((playerProgress.totalXP % 1000) / 1000) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tier Rewards */}
              <Card>
                <CardHeader>
                  <CardTitle>Tier Rewards</CardTitle>
                  <CardDescription>
                    Showing tiers {Math.max(1, (playerProgress?.currentTier || 0) - 2)} to {Math.min(battlePass.maxTier, (playerProgress?.currentTier || 0) + 8)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {battlePass.tiers
                      .filter(tier => 
                        tier.tier >= Math.max(1, (playerProgress?.currentTier || 0) - 2) &&
                        tier.tier <= Math.min(battlePass.maxTier, (playerProgress?.currentTier || 0) + 8)
                      )
                      .map(tier => (
                        <div key={tier.tier} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={playerProgress && playerProgress.currentTier >= tier.tier ? "default" : "outline"}>
                                Tier {tier.tier}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {tier.xpRequired.toLocaleString()} XP
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* Free Rewards */}
                            <div>
                              <h4 className="font-medium mb-2">Free Rewards</h4>
                              <div className="space-y-2">
                                {tier.freeRewards.map((reward, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span>{reward.amount} {reward.type}</span>
                                    <Button
                                      size="sm"
                                      variant={isRewardClaimed(tier.tier, 'free') ? "outline" : "default"}
                                      disabled={!canClaimReward(tier.tier, 'free')}
                                      onClick={() => claimReward(tier.tier, 'free')}
                                    >
                                      {isRewardClaimed(tier.tier, 'free') ? 'Claimed' : 'Claim'}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Premium Rewards */}
                            <div>
                              <h4 className="font-medium mb-2">Premium Rewards</h4>
                              <div className="space-y-2">
                                {tier.premiumRewards.map((reward, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span>{reward.amount} {reward.type}</span>
                                    <Button
                                      size="sm"
                                      variant={isRewardClaimed(tier.tier, 'premium') ? "outline" : "default"}
                                      disabled={!canClaimReward(tier.tier, 'premium')}
                                      onClick={() => claimReward(tier.tier, 'premium')}
                                    >
                                      {isRewardClaimed(tier.tier, 'premium') ? 'Claimed' : 
                                       !playerProgress?.hasPremium ? 'Premium' : 'Claim'}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">No Active Battle Pass</h3>
                <p className="text-muted-foreground mb-4">Create a new battle pass to get started</p>
                <Button onClick={() => document.querySelector('[value="management"]')?.click()}>
                  Create Battle Pass
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Battle Pass</CardTitle>
              <CardDescription>
                Set up a new seasonal battle pass with progression tiers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newBattlePass.name}
                    onChange={(e) => setNewBattlePass({...newBattlePass, name: e.target.value})}
                    placeholder="Season 1 Battle Pass"
                  />
                </div>
                <div>
                  <Label htmlFor="season">Season Number</Label>
                  <Input
                    id="season"
                    type="number"
                    value={newBattlePass.season}
                    onChange={(e) => setNewBattlePass({...newBattlePass, season: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newBattlePass.description}
                  onChange={(e) => setNewBattlePass({...newBattlePass, description: e.target.value})}
                  placeholder="Unlock exclusive rewards and progress through tiers..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newBattlePass.startDate}
                    onChange={(e) => setNewBattlePass({...newBattlePass, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newBattlePass.endDate}
                    onChange={(e) => setNewBattlePass({...newBattlePass, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="maxTier">Max Tier</Label>
                  <Input
                    id="maxTier"
                    type="number"
                    value={newBattlePass.maxTier}
                    onChange={(e) => setNewBattlePass({...newBattlePass, maxTier: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="premiumPrice">Premium Price</Label>
                  <Input
                    id="premiumPrice"
                    type="number"
                    step="0.01"
                    value={newBattlePass.premiumPrice}
                    onChange={(e) => setNewBattlePass({...newBattlePass, premiumPrice: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={newBattlePass.currency} onValueChange={(value) => setNewBattlePass({...newBattlePass, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={createBattlePass}
                disabled={!newBattlePass.name || !newBattlePass.startDate || !newBattlePass.endDate}
              >
                Create Battle Pass
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Players</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{analytics.totalPlayers}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Premium Purchases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{analytics.premiumPurchases}</p>
                    <p className="text-sm text-muted-foreground">
                      {analytics.totalPlayers > 0 ? 
                        `${((analytics.premiumPurchases / analytics.totalPlayers) * 100).toFixed(1)}% conversion` : 
                        '0% conversion'
                      }
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Tier</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{analytics.averageTier.toFixed(1)}</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>XP Testing Tools</CardTitle>
              <CardDescription>Grant XP to test players and verify progression</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="testPlayerId">Test Player ID</Label>
                <Input
                  id="testPlayerId"
                  value={testPlayerId}
                  onChange={(e) => setTestPlayerId(e.target.value)}
                  placeholder="player-123"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="activity">Activity Type</Label>
                  <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match_completion">Match Completion (100 XP)</SelectItem>
                      <SelectItem value="match_win">Match Victory (200 XP)</SelectItem>
                      <SelectItem value="kill">Elimination (25 XP)</SelectItem>
                      <SelectItem value="objective_completed">Objective Complete (150 XP)</SelectItem>
                      <SelectItem value="daily_login">Daily Login (50 XP)</SelectItem>
                      <SelectItem value="quest_completed">Quest Completed (300 XP)</SelectItem>
                      <SelectItem value="achievement_unlocked">Achievement Unlocked (500 XP)</SelectItem>
                      <SelectItem value="tournament_win">Tournament Victory (2000 XP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="customXP">Custom XP (optional)</Label>
                  <Input
                    id="customXP"
                    type="number"
                    value={customXP}
                    onChange={(e) => setCustomXP(e.target.value)}
                    placeholder="Leave empty to use default"
                  />
                </div>
              </div>

              <Button onClick={grantXP}>Grant XP</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
