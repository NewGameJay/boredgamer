"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import type { Studio } from "@/types/studio";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "@/app/dashboard.css";

interface AffiliateCode {
  id: string;
  name: string;
  code: string;
  type: 'traditional' | 'web3';
  platform: string;
  royaltyPercentage: number;
  contractAddress?: string; // For web3 NFT/token contracts
  tokenId?: string; // For NFT specific tracking
  createdAt: string;
  studioId: string;
  totalTransactions: number;
  totalVolume: number;
}

interface Transaction {
  id: string;
  affiliateCodeId: string;
  amount: number;
  royaltyAmount: number;
  timestamp: string;
  platform: string;
  transactionHash?: string; // For web3 transactions
}

export default function AffiliateDashboard() {
  const { user } = useAuth() as { user: Studio | null };
  const { toast } = useToast();
  const [affiliateCodes, setAffiliateCodes] = useState<AffiliateCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<AffiliateCode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isViewingTransactions, setIsViewingTransactions] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    type: "traditional",
    platform: "",
    royaltyPercentage: 5,
    contractAddress: "",
    tokenId: "",
  });

  const fetchAffiliateCodes = async () => {
    if (!user) return;
    
    try {
      const codesRef = collection(db, 'affiliateCodes');
      const q = query(
        codesRef,
        where('studioId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const codes: AffiliateCode[] = [];
      
      querySnapshot.forEach((doc) => {
        codes.push({ id: doc.id, ...doc.data() } as AffiliateCode);
      });

      setAffiliateCodes(codes);
    } catch (error) {
      console.error('Error fetching affiliate codes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch affiliate codes",
        variant: "destructive",
      });
    }
  };

  const createAffiliateCode = async () => {
    if (!user) return;

    try {
      const codesRef = collection(db, 'affiliateCodes');
      const code = {
        ...formData,
        studioId: user.uid,
        createdAt: new Date().toISOString(),
        totalTransactions: 0,
        totalVolume: 0,
        code: generateUniqueCode(formData.name),
      };

      await addDoc(codesRef, code);
      setIsCreating(false);
      fetchAffiliateCodes();
      toast({
        title: "Success",
        description: "Affiliate code created successfully",
      });
    } catch (error) {
      console.error('Error creating affiliate code:', error);
      toast({
        title: "Error",
        description: "Failed to create affiliate code",
        variant: "destructive",
      });
    }
  };

  const fetchTransactions = async (codeId: string) => {
    try {
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('affiliateCodeId', '==', codeId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const txs: Transaction[] = [];
      
      querySnapshot.forEach((doc) => {
        txs.push({ id: doc.id, ...doc.data() } as Transaction);
      });

      setTransactions(txs);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    }
  };

  const generateUniqueCode = (name: string): string => {
    const prefix = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
    const randomStr = Math.random().toString(36).substring(2, 7);
    return `${prefix}-${randomStr}`;
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Affiliate Management</h1>
      </div>

      <Tabs defaultValue="codes">
        <TabsList>
          <TabsTrigger value="codes">Affiliate Codes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="setup">Implementation Guide</TabsTrigger>

        </TabsList>

        <TabsContent value="codes">
          <Card>
            <CardContent>
              <Tabs defaultValue="create">
                <TabsList>
                  <TabsTrigger value="create">Create New</TabsTrigger>
                  <TabsTrigger value="manage">Manage</TabsTrigger>
                </TabsList>

                <TabsContent value="manage">
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Platform</TableHead>
                          <TableHead>Royalty %</TableHead>
                          <TableHead>Total Tx</TableHead>
                          <TableHead>Volume</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {affiliateCodes.map((code) => (
                          <TableRow key={code.id}>
                            <TableCell>{code.name}</TableCell>
                            <TableCell>{code.code}</TableCell>
                            <TableCell>{code.type}</TableCell>
                            <TableCell>{code.platform}</TableCell>
                            <TableCell>{code.royaltyPercentage}%</TableCell>
                            <TableCell>{code.totalTransactions}</TableCell>
                            <TableCell>${code.totalVolume.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCode(code);
                                  setIsViewingTransactions(true);
                                  fetchTransactions(code.id);
                                }}
                              >
                                View Transactions
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="create">
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="input w-full"
                      />
                      
                    </div>

                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, type: value })
                        }
                        className="input w-full"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="traditional">Traditional</SelectItem>
                          <SelectItem value="web3">Web3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="platform">Platform</Label>
                      <Input
                        id="platform"
                        value={formData.platform}
                        onChange={(e) =>
                          setFormData({ ...formData, platform: e.target.value })
                        }
                        className="input w-full"
                        placeholder="e.g., Steam, OpenSea, Custom Marketplace"
                      />
                    </div>

                    <div>
                      <Label htmlFor="royalty">Royalty Percentage</Label>
                      <Input
                        id="royalty"
                        type="number"
                        value={formData.royaltyPercentage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            royaltyPercentage: parseFloat(e.target.value),
                          })
                        }
                        className="input w-full"
                      />
                    </div>

                    {formData.type === "web3" && (
                      <>
                        <div>
                          <Label htmlFor="contractAddress">Contract Address</Label>
                          <Input
                            id="contractAddress"
                            value={formData.contractAddress}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                contractAddress: e.target.value,
                              })
                            }
                            className="input w-full"
                            placeholder="0x..."
                          />
                        </div>

                        <div>
                          <Label htmlFor="tokenId">Token ID (optional)</Label>
                          <Input
                            id="tokenId"
                            value={formData.tokenId}
                            onChange={(e) =>
                              setFormData({ ...formData, tokenId: e.target.value })
                            }
                            className="input w-full"
                            placeholder="For specific NFT tracking"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex justify-end">
                      <Button onClick={createAffiliateCode}>Create Affiliate Code</Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Guide</CardTitle>
              <CardDescription>
                Follow these steps to implement affiliate tracking in your game or platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="traditional">
                <TabsList>
                  <TabsTrigger value="traditional">Traditional</TabsTrigger>
                  <TabsTrigger value="web3">Web3</TabsTrigger>
                </TabsList>

                <TabsContent value="traditional">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Setup Steps</h3>
                      <div className="space-y-4 text-sm text-gray-400">
                        <p>1. Create an affiliate code in the dashboard</p>
                        <p>2. Set up your payout method (PayPal or bank account)</p>
                        <p>3. Implement tracking in your marketplace</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">API Integration</h3>
                      <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
{`POST https://api.boredgamer.com/v1/track-transaction
{
  "affiliateCode": "your-code",
  "amount": 100.00,
  "platform": "steam",
  "currency": "USD",
  "transactionId": "tx_123",
  "metadata": {
    "itemId": "123",
    "itemName": "Sword",
    "customerId": "cust_456"
  }
}`}
                      </pre>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Payout System</h3>
                      <div className="space-y-2 text-sm text-gray-400">
                        <p>• Royalties are processed monthly</p>
                        <p>• Minimum payout threshold: $50</p>
                        <p>• Test Mode Active</p>
                        <p className="text-yellow-500">Currently in testing mode - no real payments are processed</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">API Authentication</h3>
                      <div className="space-y-2 text-sm text-gray-400">
                        <p>1. Get your API key from the dashboard settings</p>
                        <p>2. Include it in the Authorization header:</p>
                        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto mt-2">
{`Authorization: Bearer your-api-key`}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Example Integration</h3>
                      <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
{`// JavaScript/TypeScript Example
async function trackPurchase(purchaseData) {
  const response = await fetch('https://api.boredgamer.com/v1/track-transaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-api-key'
    },
    body: JSON.stringify({
      affiliateCode: 'CODE123',
      amount: 100.00,
      platform: 'steam',
      currency: 'USD',
      transactionId: 'tx_123',
      metadata: {
        itemId: '123',
        itemName: 'Game Item',
        customerId: 'cust_456'
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error);
  }
  return data;
}`}
                      </pre>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Rate Limits</h3>
                      <div className="space-y-2 text-sm text-gray-400">
                        <p>• 100 requests per minute per API key</p>
                        <p>• Bulk transaction endpoint available for high-volume needs</p>
                        <p>• Contact support for higher limits</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="web3">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Security Architecture</h3>
                      <div className="space-y-2 text-sm text-gray-400">
                        <p>Our system uses a secure registry contract to manage affiliate payments:</p>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Pre-verified affiliate addresses</li>
                          <li>Rate-limited royalties</li>
                          <li>Audited smart contracts</li>
                          <li>Multi-chain support</li>
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Registry Contract</h3>
                      <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract AffiliateRegistry {
    mapping(bytes32 => address) public affiliatePayouts;
    mapping(bytes32 => uint256) public royaltyRates;
    
    event RoyaltyPaid(
        bytes32 indexed codeHash,
        address indexed recipient,
        uint256 amount
    );
    
    function processRoyalty(
        string memory code,
        uint256 amount
    ) external payable {
        bytes32 codeHash = keccak256(
            abi.encodePacked(code)
        );
        address payoutAddress = affiliatePayouts[codeHash];
        require(payoutAddress != address(0), "Invalid code");
        
        uint256 royaltyAmount = (amount * royaltyRates[codeHash]) / 10000;
        (bool success, ) = payoutAddress.call{value: royaltyAmount}("");
        require(success, "Transfer failed");
        
        emit RoyaltyPaid(codeHash, payoutAddress, royaltyAmount);
    }
}`}
                      </pre>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Integration Steps</h3>
                      <div className="space-y-4 text-sm text-gray-400">
                        <div>
                          <p className="font-medium">1. NFT Marketplace Integration</p>
                          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto mt-2">
{`// In your NFT sale contract
function purchaseNFT(string memory affiliateCode) external payable {
    // ... your NFT sale logic ...
    
    // Process affiliate royalty
    if (affiliateCode.length > 0) {
        IAffiliateRegistry(REGISTRY_ADDRESS).processRoyalty{
            value: msg.value
        }(affiliateCode, msg.value);
    }
}`}
                          </pre>
                        </div>

                        <div>
                          <p className="font-medium">2. Token Sale Integration</p>
                          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto mt-2">
{`// In your token sale contract
function purchaseTokens(
    string memory affiliateCode,
    uint256 amount
) external payable {
    // ... your token sale logic ...
    
    // Calculate royalty
    uint256 royalty = calculateRoyalty(amount);
    
    // Process affiliate payment
    if (affiliateCode.length > 0) {
        IERC20(paymentToken).approve(REGISTRY_ADDRESS, royalty);
        IAffiliateRegistry(REGISTRY_ADDRESS).processRoyalty(
            affiliateCode,
            royalty
        );
    }
}`}
                          </pre>
                        </div>

                        <div>
                          <p className="font-medium">3. Web3 SDK Integration</p>
                          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto mt-2">
{`// NPM package
npm install @boredgamer/web3-affiliate-sdk

// Initialize
const affiliateSystem = new Web3AffiliateSystem({
  registryAddress: REGISTRY_ADDRESS,
  provider: window.ethereum
});

// Process royalty
await affiliateSystem.processRoyalty({
  code: 'affiliate-code',
  amount: ethers.utils.parseEther('0.1'),
  tokenAddress: TOKEN_ADDRESS // optional for ERC20
});`}
                          </pre>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Supported Networks</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Mainnet:</p>
                          <ul className="list-disc pl-6 space-y-1 text-gray-400">
                            <li>Ethereum</li>
                            <li>Polygon</li>
                            <li>Arbitrum</li>
                            <li>Optimism</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium">Testnet:</p>
                          <ul className="list-disc pl-6 space-y-1 text-gray-400">
                            <li>Goerli</li>
                            <li>Mumbai</li>
                            <li>Arbitrum Goerli</li>
                            <li>Optimism Goerli</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>
                View performance metrics for your affiliate codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add analytics charts and metrics here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>



      {/* View Transactions Dialog */}
      <Dialog
        open={isViewingTransactions}
        onOpenChange={setIsViewingTransactions}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Transactions - {selectedCode?.name}
            </DialogTitle>
            <DialogDescription>
              View all transactions for this affiliate code
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Royalty</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Transaction Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </TableCell>
                  <TableCell>${tx.amount.toFixed(2)}</TableCell>
                  <TableCell>${tx.royaltyAmount.toFixed(2)}</TableCell>
                  <TableCell>{tx.platform}</TableCell>
                  <TableCell>
                    {tx.transactionHash ? (
                      <a
                        href={`https://etherscan.io/tx/${tx.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {tx.transactionHash.slice(0, 8)}...
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewingTransactions(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
