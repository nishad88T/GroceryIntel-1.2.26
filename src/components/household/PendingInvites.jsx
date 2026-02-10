import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { appClient } from '@/api/appClient';
import { Loader2, Clock, CheckCircle, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PendingInvites = ({ householdId }) => {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [cleaningUp, setCleaningUp] = useState(false);
    const [error, setError] = useState(null);
    const [showAll, setShowAll] = useState(false);

    const loadInvitations = async () => {
        try {
            setError(null);
            if (!householdId) return;
            
            const inviteData = await appClient.entities.HouseholdInvitation.filter({ household_id: householdId });
            setInvitations(inviteData || []);
        } catch (error) {
            console.error("Error loading invitations:", error);
            setError("Failed to load invitations. Please refresh the page.");
            setInvitations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvitations();
    }, [householdId]);

    const handleDeleteInvitation = async (invitationId) => {
        if (!confirm("Are you sure you want to delete this invitation?")) {
            return;
        }

        setDeletingId(invitationId);
        setError(null);
        
        try {
            await appClient.entities.HouseholdInvitation.delete(invitationId);
            
            // Update local state
            setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        } catch (error) {
            console.error("Error deleting invitation:", error);
            setError(`Failed to delete invitation: ${error.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleCleanupOldInvitations = async () => {
        if (!confirm("This will delete all accepted, expired, and old (30+ days) pending invitations. Continue?")) {
            return;
        }

        setCleaningUp(true);
        setError(null);
        
        try {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            const toDelete = invitations.filter(inv => {
                // Delete if accepted or expired
                if (inv.status === 'accepted' || inv.status === 'expired') {
                    return true;
                }
                
                // Delete if pending but created more than 30 days ago
                if (inv.status === 'pending') {
                    const createdDate = new Date(inv.created_date);
                    return createdDate < thirtyDaysAgo;
                }
                
                return false;
            });

            // Delete all marked invitations
            for (const inv of toDelete) {
                await appClient.entities.HouseholdInvitation.delete(inv.id);
            }

            // Reload invitations
            await loadInvitations();
            
            alert(`Successfully cleaned up ${toDelete.length} invitation(s).`);
        } catch (error) {
            console.error("Error cleaning up invitations:", error);
            setError(`Cleanup failed: ${error.message}`);
        } finally {
            setCleaningUp(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Calculate counts for display and button visibility
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const pendingCount = invitations.filter(inv => inv.status === 'pending').length;
    
    // Count invitations that CAN be cleaned up: accepted, expired, OR old pending
    const cleanableCount = invitations.filter(inv => {
        if (inv.status === 'accepted' || inv.status === 'expired') {
            return true;
        }
        if (inv.status === 'pending') {
            const createdDate = new Date(inv.created_date);
            return createdDate < thirtyDaysAgo;
        }
        return false;
    }).length;

    // Filter invitations based on showAll toggle
    const filteredInvitations = showAll 
        ? invitations 
        : invitations.filter(inv => inv.status === 'pending');

    const nonPendingCount = invitations.length - pendingCount;

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>
                        Pending Invitations ({pendingCount})
                        {nonPendingCount > 0 && !showAll && (
                            <span className="text-sm text-slate-500 ml-2">
                                +{nonPendingCount} completed/expired
                            </span>
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {invitations.length > 0 && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAll(!showAll)}
                                    className="text-xs"
                                >
                                    {showAll ? 'Show Pending Only' : 'Show All'}
                                </Button>
                                {cleanableCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCleanupOldInvitations}
                                        disabled={cleaningUp}
                                        className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    >
                                        {cleaningUp ? (
                                            <>
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                Cleaning...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-3 h-3 mr-1" />
                                                Cleanup ({cleanableCount})
                                            </>
                                        )}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert className="mb-4 border-red-200 bg-red-50">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <AlertDescription className="text-red-800 text-sm">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                {filteredInvitations.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                        {showAll 
                            ? "No invitations found." 
                            : "No pending invitations."}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {filteredInvitations.map((invitation) => {
                            const isOld = invitation.status === 'pending' && 
                                new Date(invitation.created_date) < thirtyDaysAgo;
                            
                            return (
                                <li 
                                    key={invitation.id} 
                                    className={`flex items-center justify-between p-3 rounded-lg ${
                                        invitation.status === 'pending' 
                                            ? 'bg-blue-50 border border-blue-100' 
                                            : 'bg-gray-50'
                                    }`}
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-800">{invitation.invitee_email}</p>
                                        <p className="text-sm text-gray-600">
                                            Invited by {invitation.inviter_name} • {formatDistanceToNow(new Date(invitation.created_date), { addSuffix: true })}
                                        </p>
                                        {isOld && (
                                            <p className="text-xs text-orange-600 mt-1">⚠️ Created over 30 days ago</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {invitation.status === 'pending' && (
                                            <div className="flex items-center text-yellow-600">
                                                <Clock className="w-4 h-4 mr-1" />
                                                <span className="text-sm font-medium">Pending</span>
                                            </div>
                                        )}
                                        {invitation.status === 'accepted' && (
                                            <div className="flex items-center text-green-600">
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                <span className="text-sm font-medium">Accepted</span>
                                            </div>
                                        )}
                                        {invitation.status === 'expired' && (
                                            <div className="flex items-center text-red-600">
                                                <XCircle className="w-4 h-4 mr-1" />
                                                <span className="text-sm font-medium">Expired</span>
                                            </div>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteInvitation(invitation.id)}
                                            disabled={deletingId === invitation.id}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            {deletingId === invitation.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
};

export default PendingInvites;