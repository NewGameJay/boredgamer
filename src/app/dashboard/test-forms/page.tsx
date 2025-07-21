
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormValidator } from '@/test/form-validation';

export default function TestFormsPage() {
  const [testResults, setTestResults] = useState<any>({});

  const runFormTests = () => {
    const results: any = {};

    // Test Leaderboard Form
    const leaderboardData = {
      name: 'Test Leaderboard',
      startDate: '2025-01-20T12:00',
      fields: [{ id: '1', value: 'score', required: true }],
      scoreCalculation: 'highest'
    };
    results.leaderboard = FormValidator.validateLeaderboardForm(leaderboardData);

    // Test Quest Form
    const questData = {
      name: 'Test Quest',
      description: 'A test quest description',
      startDate: '2025-01-20T12:00',
      endDate: '2025-01-27T12:00',
      conditions: [{ type: 'score', operator: '>', value: '1000' }],
      rewards: [{ type: 'points', amount: 100 }]
    };
    results.quest = FormValidator.validateQuestForm(questData);

    // Test Tournament Form
    const tournamentData = {
      name: 'Test Tournament',
      description: 'A test tournament description',
      startDate: '2025-01-20T12:00',
      endDate: '2025-01-27T12:00',
      maxParticipants: 16,
      prizes: [{ rank: 1, reward: { type: 'points', amount: 1000 } }]
    };
    results.tournament = FormValidator.validateTournamentForm(tournamentData);

    // Test Community Form
    const communityData = {
      name: 'Test Community',
      description: 'A test community description',
      referralGame: 'test-game',
      referralSlug: 'test-community',
      referralDestination: 'https://example.com'
    };
    results.community = FormValidator.validateCommunityForm(communityData);

    // Test Battle Pass Form
    const battlePassData = {
      name: 'Test Battle Pass',
      description: 'A test battle pass description',
      startDate: '2025-01-20T12:00',
      endDate: '2025-03-20T12:00',
      maxTier: 100,
      premiumPrice: 9.99
    };
    results.battlepass = FormValidator.validateBattlePassForm(battlePassData);

    setTestResults(results);
  };

  const testFirebaseConnections = async () => {
    const connectionResults: any = {};

    try {
      // Test Firestore collections exist
      const collections = ['leaderboards', 'quests', 'tournaments', 'communities', 'battlepass'];
      
      for (const collection of collections) {
        try {
          const response = await fetch(`/api/test-collection?collection=${collection}`);
          connectionResults[collection] = response.ok ? 'Connected' : 'Failed';
        } catch (error) {
          connectionResults[collection] = 'Error';
        }
      }
    } catch (error) {
      console.error('Connection test error:', error);
    }

    setTestResults(prev => ({ ...prev, connections: connectionResults }));
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Form Validation Tests</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Form Validation Tests</CardTitle>
            <CardDescription>Test all create forms with sample data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={runFormTests}>Run Form Validation Tests</Button>
              
              {Object.keys(testResults).length > 0 && (
                <div className="space-y-4">
                  {Object.entries(testResults).map(([formType, result]: [string, any]) => (
                    <div key={formType} className="border rounded p-4">
                      <h3 className="font-semibold capitalize">{formType} Form</h3>
                      <div className={`mt-2 ${result.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        Status: {result.isValid ? 'Valid' : 'Invalid'}
                      </div>
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-2">
                          <h4 className="font-medium text-red-600">Errors:</h4>
                          <ul className="list-disc pl-5">
                            {result.errors.map((error: string, index: number) => (
                              <li key={index} className="text-red-600">{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.warnings && result.warnings.length > 0 && (
                        <div className="mt-2">
                          <h4 className="font-medium text-yellow-600">Warnings:</h4>
                          <ul className="list-disc pl-5">
                            {result.warnings.map((warning: string, index: number) => (
                              <li key={index} className="text-yellow-600">{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Connection Tests</CardTitle>
            <CardDescription>Test connections to Firebase collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={testFirebaseConnections}>Test Database Connections</Button>
              
              {testResults.connections && (
                <div className="space-y-2">
                  {Object.entries(testResults.connections).map(([collection, status]: [string, any]) => (
                    <div key={collection} className="flex justify-between items-center border rounded p-2">
                      <span className="capitalize">{collection}</span>
                      <span className={`font-medium ${status === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
