import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { mapping_id, updates } = await req.json();
        
        if (!mapping_id || !updates) {
            return Response.json({ 
                error: 'Invalid request. Expected mapping_id and updates object' 
            }, { status: 400 });
        }

        const updated = await base44.asServiceRole.entities.OfficialCategoryMapping.update(
            mapping_id, 
            updates
        );

        return Response.json({
            success: true,
            message: 'Category mapping updated successfully',
            mapping: updated
        });

    } catch (error) {
        console.error('Error updating category mapping:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});