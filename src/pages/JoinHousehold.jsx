import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, CheckCircle, XCircle, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

const JoinHouseholdPage = () => {
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [invitation, setInvitation] = useState(null);
    const [household, setHousehold] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const loadInvitation = async () => {
            try {
                // Extract token from URL
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');

                if (!token) {
                    setError('Invalid invitation link - no token provided');
                    setLoading(false);
                    return;
                }

                // Check if user is authenticated
                const user = await appClient.auth.me();
                if (!user) {
                    // Redirect to login with return URL
                    const currentUrl = window.location.pathname + window.location.search;
                    appClient.auth.redirectToLogin(currentUrl);
                    return;
                }

                // Fetch the invitation using the token
                const invitations = await appClient.entities.HouseholdInvitation.filter({ token });
                
                if (!invitations || invitations.length === 0) {
                    setError('Invitation not found or has expired');
                    setLoading(false);
                    return;
                }

                const inv = invitations[0];

                // Check if invitation is still valid
                if (inv.status !== 'pending') {
                    setError(`This invitation has already been ${inv.status}`);
                    setLoading(false);
                    return;
                }

                // Check if expired
                const expiresAt = new Date(inv.expires_at);
                if (expiresAt < new Date()) {
                    setError('This invitation has expired');
                    setLoading(false);
                    return;
                }

                // Check if the user's email matches the invitation
                if (user.email !== inv.invitee_email) {
                    setError(`This invitation was sent to ${inv.invitee_email}, but you are logged in as ${user.email}`);
                    setLoading(false);
                    return;
                }

                // Fetch household details
                const households = await appClient.entities.Household.filter({ id: inv.household_id });
                if (!households || households.length === 0) {
                    setError('Household not found');
                    setLoading(false);
                    return;
                }

                setInvitation(inv);
                setHousehold(households[0]);
                setLoading(false);

            } catch (err) {
                console.error('Error loading invitation:', err);
                setError('Failed to load invitation: ' + err.message);
                setLoading(false);
            }
        };

        loadInvitation();
    }, []);

    const handleAccept = async () => {
        setProcessing(true);
        setError(null);

        try {
            // Call backend function to mark invitation as accepted and update user's household_id
            await appClient.functions.invoke('markInvitationAccepted', {
                invitation_id: invitation.id,
                household_id: household.id
            });

            setSuccess(true);

            // Redirect to household page after a short delay
            setTimeout(() => {
                navigate(createPageUrl('Household'));
            }, 2000);

        } catch (err) {
            console.error('Error accepting invitation:', err);
            setError('Failed to accept invitation: ' + err.message);
            setProcessing(false);
        }
    };

    const handleDecline = () => {
        navigate(createPageUrl('Dashboard'));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
                    <p className="text-slate-600">Loading invitation...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-6 h-6" />
                            Invalid Invitation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        <Button 
                            onClick={() => navigate(createPageUrl('Dashboard'))}
                            className="w-full"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-6 h-6" />
                            Success!
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-700 mb-4">
                            You've successfully joined <strong>{household?.name}</strong>!
                        </p>
                        <p className="text-sm text-slate-600">
                            Redirecting to your household page...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-6 h-6 text-emerald-600" />
                        Household Invitation
                    </CardTitle>
                    <CardDescription>
                        You've been invited to join a household
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-sm text-slate-600 mb-2">
                            <strong>{invitation?.inviter_name || 'Someone'}</strong> has invited you to join:
                        </p>
                        <p className="text-2xl font-bold text-emerald-700">
                            {household?.name}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm text-slate-600">
                            By accepting, you'll be able to:
                        </p>
                        <ul className="text-sm text-slate-600 space-y-1 ml-4">
                            <li>• Share receipts and budgets</li>
                            <li>• Track household spending together</li>
                            <li>• Collaborate on meal planning</li>
                            <li>• View shared analytics</li>
                        </ul>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={handleDecline}
                            variant="outline"
                            className="flex-1"
                            disabled={processing}
                        >
                            Decline
                        </Button>
                        <Button
                            onClick={handleAccept}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                'Accept Invitation'
                            )}
                        </Button>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default JoinHouseholdPage;