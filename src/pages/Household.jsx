import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, Users, Loader2, AlertTriangle, Wrench, CheckCircle, Info, UserCircle, ScanLine } from 'lucide-react';
import InviteForm from '@/components/household/InviteForm';
import JoinHouseholdForm from '@/components/household/JoinHouseholdForm';
import { appClient } from '@/api/appClient';

const HouseholdPage = () => {
    const [household, setHousehold] = useState(null);
    const [members, setMembers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fixing, setFixing] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccessMessage(null);
            
            // Use appClient.auth.me() to get fresh user data including household_id
            const user = await appClient.auth.me();
            console.log("[Household Page] Current user:", user?.email, "household_id:", user?.household_id);
            setCurrentUser(user);

            if (!user) {
                setError("no_user");
                setLoading(false);
                return;
            }

            if (!user.household_id) {
                console.log("[Household Page] User has no household_id set");
                setError("no_household");
                setLoading(false);
                return;
            }

            // Use backend function to fetch household data (bypasses RLS issues)
            console.log("[Household Page] Fetching household with ID:", user.household_id);
            const response = await appClient.functions.invoke('getMyHousehold');
            console.log("[Household Page] Household response:", response.data);

            if (response.data.household) {
                const householdData = response.data.household;
                setHousehold(householdData);
                setMembers(response.data.members || [user]);
                console.log("[Household Page] Household loaded:", householdData.name, "admin:", householdData.admin_id);
                
                // If we just fixed the household, show success message
                if (sessionStorage.getItem('householdJustFixed')) {
                    setSuccessMessage("✅ Your household has been successfully created and linked to your account!");
                    sessionStorage.removeItem('householdJustFixed');
                }
            } else {
                console.warn("[Household Page] User is linked to a non-existent household. Presenting the fix UI.");
                setError("household_not_found");
            }
            
        } catch (err) {
            console.error("[Household Page] Critical error in loadData:", err);
            setError("general_error");
        } finally {
            setLoading(false);
        }
    }, []);

    const manualFix = async () => {
        setFixing(true);
        setError(null);
        setSuccessMessage(null);
        
        try {
            console.log("Starting comprehensive household fix...");
            
            // Step 1: Clear the invalid household_id
            await appClient.auth.updateMe({ household_id: null });
            console.log("Cleared invalid household_id");
            
            // Step 2: Create a new household
            const newHousehold = await appClient.entities.Household.create({
                name: `${currentUser?.full_name || currentUser?.email || 'User'}'s Household`,
                admin_id: currentUser.id
            });
            console.log("Created new household:", newHousehold.id);
            
            // Step 3: Link user to new household
            await appClient.auth.updateMe({ household_id: newHousehold.id });
            console.log("Linked user to new household");

            // Step 4: Update component state immediately
            const updatedUser = { ...currentUser, household_id: newHousehold.id };
            setCurrentUser(updatedUser);
            setHousehold(newHousehold);
            setMembers([updatedUser]);
            setError(null);
            
            // Mark that we just fixed the household for success message
            sessionStorage.setItem('householdJustFixed', 'true');
            
            setSuccessMessage("🎉 Household successfully created! You can now invite family members and use all household features.");
            console.log("Household fix complete.");

        } catch (error) {
            console.error('Manual fix failed:', error);
            setError("fix_failed");
        } finally {
            setFixing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen flex justify-center items-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
                    <p className="text-slate-600">Loading household...</p>
                </div>
            </div>
        );
    }

    // Calculate individual user limits for non-household users
    // Map old tier names to new ones for display
    const getTierDisplayName = (tier) => {
        const tierMap = {
            'lite': 'Standard',
            'family': 'Plus',
            'standard': 'Standard',
            'plus': 'Plus',
            'free': 'Free Trial',
            'free_trial': 'Free Trial'
        };
        return tierMap[tier?.toLowerCase()] || tier || 'Free Trial';
    };
    
    const userTier = currentUser?.tier?.toLowerCase();
    const userScansUsed = currentUser?.monthly_scan_count || 0;
    const userScanLimit = (userTier === 'plus' || userTier === 'family') ? 30 : (userTier === 'standard' || userTier === 'lite') ? 12 : 4;
    const userScansRemaining = Math.max(0, userScanLimit - userScansUsed);
    const userScanPercentage = Math.min(100, (userScansUsed / userScanLimit) * 100);

    if (error) {
        return (
            <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Individual User Status for non-household users */}
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCircle className="w-5 h-5 text-blue-600" />
                                Your Account Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-50 rounded-lg">
                                    <p className="text-sm text-emerald-700 font-medium">Your Subscription</p>
                                    <p className="text-lg font-bold text-emerald-900">
                                        {getTierDisplayName(currentUser?.tier)}
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-purple-700 font-medium">Your Scans This Month</p>
                                    <p className="text-lg font-bold text-purple-900">{userScansUsed} / {userScanLimit}</p>
                                </div>
                            </div>
                            
                            {/* User Scan Usage Progress */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Your Monthly Scan Allowance</span>
                                    <span className={userScansRemaining <= 1 ? "text-orange-600 font-medium" : "text-slate-600"}>
                                        {userScansRemaining} remaining
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5">
                                    <div 
                                        className={`h-2.5 rounded-full transition-all ${
                                            userScanPercentage >= 90 ? 'bg-red-500' : 
                                            userScanPercentage >= 70 ? 'bg-orange-500' : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${userScanPercentage}%` }}
                                    />
                                </div>
                            </div>

                            <Alert className="border-blue-200 bg-blue-50">
                                <Info className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800 text-sm">
                                    Create or join a household to share receipts, budgets, and meal plans with family members. Household subscriptions apply to all members.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-700">
                                <AlertTriangle className="w-5 h-5" />
                                {error === "household_not_found" || error === "no_household" ? "Household Setup" : "Account Setup Required"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(error === "no_household" || error === "household_not_found") && (
                                <div>
                                    <p className="text-slate-700 mb-4">
                                        Create a household to share data with family, or join an existing one:
                                    </p>
                                </div>
                            )}

                            {error === "fix_failed" && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-700 text-sm">
                                        The fix failed. Please refresh and try again. If the problem persists, contact support.
                                    </p>
                                </div>
                            )}

                            <Button 
                                onClick={manualFix} 
                                disabled={fixing} 
                                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 text-lg"
                            >
                                {fixing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Creating Your Household...
                                    </>
                                ) : (
                                    <>
                                        <Wrench className="w-5 h-5 mr-2" />
                                        Create Household
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {(error === "no_household" || error === "household_not_found") && (
                        <JoinHouseholdForm onSuccess={loadData} />
                    )}
                </div>
            </div>
        );
    }

    const isCurrentUserAdmin = currentUser?.id === household?.admin_id;
    
    // Calculate scan usage
    const scansUsed = household?.household_monthly_scan_count || 0;
    const scanLimit = household?.household_scan_limit || 12;
    const scansRemaining = Math.max(0, scanLimit - scansUsed);
    const scanPercentage = Math.min(100, (scansUsed / scanLimit) * 100);

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                       <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{household?.name || 'Household'}</h1>
                        <p className="text-slate-600">Manage your shared household and members.</p>
                    </div>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <p className="text-green-800 font-medium">{successMessage}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Household Status Card */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-600" />
                            Household Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-emerald-50 rounded-lg">
                                <p className="text-sm text-emerald-700 font-medium">Subscription</p>
                                <p className="text-lg font-bold text-emerald-900">
                                    {getTierDisplayName(household?.subscription_tier)}
                                    {isCurrentUserAdmin && (
                                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Admin</span>
                                    )}
                                </p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-700 font-medium">Members</p>
                                <p className="text-lg font-bold text-blue-900">{members.length}</p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <p className="text-sm text-purple-700 font-medium">Scans This Month</p>
                                <p className="text-lg font-bold text-purple-900">{scansUsed} / {scanLimit}</p>
                            </div>
                        </div>
                        
                        {/* Scan Usage Progress */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-600">Monthly Scan Allowance</span>
                                <span className={scansRemaining <= 2 ? "text-orange-600 font-medium" : "text-slate-600"}>
                                    {scansRemaining} remaining
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div 
                                    className={`h-2.5 rounded-full transition-all ${
                                        scanPercentage >= 90 ? 'bg-red-500' : 
                                        scanPercentage >= 70 ? 'bg-orange-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${scanPercentage}%` }}
                                />
                            </div>
                        </div>

                        {household?.invite_code && (
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="text-sm text-slate-600 mb-1">Household Invite Code</p>
                                <p className="text-xl font-mono font-bold text-slate-900 tracking-wider">
                                    {household.invite_code}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Share this code with family members to let them join your household
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Household Members ({members.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {members.map(member => {
                                const isAdmin = member.id === household?.admin_id;
                                const joinDate = member.created_date ? new Date(member.created_date).toLocaleDateString('en-GB', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric' 
                                }) : null;
                                
                                return (
                                    <li key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12">
                                                <AvatarFallback className={isAdmin ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700"}>
                                                    {member.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-slate-800">{member.full_name || 'Unknown'}</p>
                                                    {isAdmin && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                                            <Crown className="w-3 h-3" /> Admin
                                                        </span>
                                                    )}
                                                    {!isAdmin && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                                            Member
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-600">{member.email}</p>
                                                {joinDate && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {isAdmin ? 'Created household' : 'Joined'} on {joinDate}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {member.id === currentUser?.id && (
                                            <span className="text-xs text-slate-400 italic">You</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>

                {isCurrentUserAdmin && (
                    <div className="space-y-4">
                        <InviteForm householdId={household?.id} householdName={household?.name || 'Unknown Household'} />
                    </div>
                )}

                {!currentUser?.household_id && (
                    <div className="space-y-4">
                        <JoinHouseholdForm onSuccess={loadData} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default HouseholdPage;