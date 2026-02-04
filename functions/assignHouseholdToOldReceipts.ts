import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { resolveHouseholdId } from './_helpers/household.ts';

// Version 3.0 - Enhanced to handle orphaned records with missing user identifiers
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentHouseholdId = await resolveHouseholdId(base44, user);
        if (!currentHouseholdId) {
            return Response.json({ error: 'User does not have a household assigned. Please set up your household first.' }, { status: 400 });
        }

        const userEmail = user.email;
        const userId = user.id;

        console.log("=====================================");
        console.log("STARTING ENHANCED DATA RECOVERY RUN - V3.0");
        console.log(`User Context - Email: ${userEmail}, ID: ${userId}, Target Household ID: ${currentHouseholdId}`);
        console.log("=====================================");

        const entityTypes = ['Receipt', 'Budget', 'CorrectionLog', 'FailedScanLog', 'NutritionFact', 'FailedNutritionLookup', 'CreditLog', 'OCRFeedback'];
        let totalFound = 0;
        let totalUpdated = 0;
        let updateSummary = {};

        for (const entityType of entityTypes) {
            try {
                console.log(`\n----- Processing Entity Type: ${entityType} -----`);
                
                const allEntities = await base44.asServiceRole.entities[entityType].filter({}, '-created_date', 5000);
                
                if (!allEntities || allEntities.length === 0) {
                    console.log(`No ${entityType} entities found.`);
                    updateSummary[entityType] = { found: 0, owned: 0, orphaned: 0, updated: 0 };
                    continue;
                }

                totalFound += allEntities.length;
                const entitiesToUpdate = [];
                let ownedCount = 0;
                let orphanedCount = 0;

                for (const entity of allEntities) {
                    // Check 1: Does this record explicitly belong to the current user?
                    const belongsToUser = entity.created_by === userId || entity.created_by === userEmail || entity.user_email === userEmail;
                    
                    // Check 2: Is this an "orphaned" record (missing household AND missing user identifiers)?
                    const isOrphaned = !entity.household_id && (!entity.created_by || !entity.user_email);
                    
                    let shouldUpdate = false;
                    
                    if (belongsToUser && entity.household_id !== currentHouseholdId) {
                        // Scenario A: Record explicitly belongs to user but has wrong/missing household
                        shouldUpdate = true;
                        ownedCount++;
                        console.log(`✓ Found owned record: ${entityType} ${entity.id} (created_by: ${entity.created_by}, user_email: ${entity.user_email})`);
                    } else if (isOrphaned) {
                        // Scenario B: Record is orphaned (no household, no user identifiers)
                        // We'll claim it for the current user since they're running recovery
                        shouldUpdate = true;
                        orphanedCount++;
                        console.log(`⚠ Found orphaned record: ${entityType} ${entity.id} (household_id: ${entity.household_id}, created_by: ${entity.created_by}, user_email: ${entity.user_email})`);
                    }
                    
                    if (shouldUpdate) {
                        entitiesToUpdate.push(entity.id);
                    }
                }
                
                console.log(`Found ${entitiesToUpdate.length} ${entityType} records to re-link (${ownedCount} owned, ${orphanedCount} orphaned).`);
                updateSummary[entityType] = { found: allEntities.length, owned: ownedCount, orphaned: orphanedCount, updated: 0 };

                if (entitiesToUpdate.length > 0) {
                    for (const entityId of entitiesToUpdate) {
                        try {
                            // Always set both household_id AND user_email to ensure complete linking
                            await base44.asServiceRole.entities[entityType].update(entityId, {
                                household_id: currentHouseholdId,
                                user_email: userEmail
                            });
                            totalUpdated++;
                            updateSummary[entityType].updated++;
                        } catch (updateError) {
                            console.error(`❌ FAILED to update ${entityType} ${entityId}:`, updateError.message);
                        }
                    }
                    console.log(`✅ SUCCESS: Re-linked ${updateSummary[entityType].updated} of ${entitiesToUpdate.length} ${entityType} records.`);
                }
            } catch (entityError) {
                console.error(`Error processing ${entityType}:`, entityError.message);
                updateSummary[entityType] = { found: 0, owned: 0, orphaned: 0, updated: 0, error: entityError.message };
            }
        }
        
        console.log("\n=====================================");
        console.log("ENHANCED DATA RECOVERY RUN COMPLETE - V3.0");
        const responseMessage = `Data recovery completed. Scanned ${totalFound} total records and successfully re-linked ${totalUpdated} records to your account.`;
        console.log(responseMessage);
        console.log("=====================================");

        return Response.json({
            status: 'success',
            message: responseMessage,
            details: {
                totalEntitiesScanned: totalFound,
                totalEntitiesUpdated: totalUpdated,
                updateSummary
            }
        }, { status: 200 });

    } catch (error) {
        console.error('CRITICAL Error in data recovery function:', error);
        return Response.json({ 
            error: 'An internal server error occurred during data recovery.', 
            details: error.message 
        }, { status: 500 });
    }
});
