
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

interface Tournament {
  id: string;
  name: string;
  participants?: any[];
  maxParticipants: number;
  currentParticipants: number;
  status: string;
}

interface ParticipantManagerProps {
  tournament: Tournament;
  onUpdate: () => void;
}

export default function ParticipantManager({ tournament, onUpdate }: ParticipantManagerProps) {
  const [newParticipant, setNewParticipant] = useState({
    playerId: '',
    displayName: '',
    email: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  const handleRegisterParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register',
          tournamentId: tournament.id,
          playerId: newParticipant.playerId,
          playerData: {
            displayName: newParticipant.displayName,
            email: newParticipant.email
          }
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Participant registered successfully!",
        });
        setNewParticipant({ playerId: '', displayName: '', email: '' });
        onUpdate();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to register participant",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to register participant",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const canRegister = tournament.status === 'registration' && 
                     tournament.currentParticipants < tournament.maxParticipants;

  return (
    <div className="space-y-6">
      {/* Registration Form */}
      {canRegister && (
        <Card>
          <CardHeader>
            <CardTitle>Register New Participant</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegisterParticipant} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="playerId">Player ID *</Label>
                  <Input
                    id="playerId"
                    value={newParticipant.playerId}
                    onChange={(e) => setNewParticipant({...newParticipant, playerId: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={newParticipant.displayName}
                    onChange={(e) => setNewParticipant({...newParticipant, displayName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newParticipant.email}
                    onChange={(e) => setNewParticipant({...newParticipant, email: e.target.value})}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isRegistering}>
                {isRegistering ? 'Registering...' : 'Register Participant'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Participants List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Participants ({tournament.currentParticipants}/{tournament.maxParticipants})</CardTitle>
            <Badge variant={canRegister ? 'default' : 'secondary'}>
              {tournament.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {tournament.participants && tournament.participants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player ID</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournament.participants.map((participant, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{participant.playerId}</TableCell>
                    <TableCell>{participant.displayName || '-'}</TableCell>
                    <TableCell>{participant.email || '-'}</TableCell>
                    <TableCell>
                      {participant.registeredAt ? 
                        new Date(participant.registeredAt).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No participants registered yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
