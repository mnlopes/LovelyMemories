'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { RolePermission, AppRole } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserRole } from './user';

/**
 * Fetch all role permissions for the matrix UI.
 * Restricted to super_admin and admin.
 */
export async function getRolePermissions(): Promise<RolePermission[]> {
    const role = await getCurrentUserRole();
    if (role !== 'super_admin' && role !== 'admin') {
        throw new Error('Not authorized to view permissions');
    }

    const supabase = await getSupabaseAdmin();
    const { data: permissions, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('module_name')
        .order('role_name');

    if (error) {
        console.error('Error fetching role permissions', error);
        throw new Error('Failed to load permissions');
    }

    return permissions as RolePermission[];
}

/**
 * Update a specific permission toggle.
 * Restricted to super_admin and admin.
 */
export async function updateRolePermission(
    permissionId: string, 
    field: 'can_view' | 'can_edit', 
    value: boolean
) {
    const role = await getCurrentUserRole();
    if (role !== 'super_admin' && role !== 'admin') {
        throw new Error('Not authorized to update permissions');
    }

    const supabase = await getSupabaseAdmin();
    const { error } = await supabase
        .from('role_permissions')
        .update({ [field]: value })
        .eq('id', permissionId);

    if (error) {
        console.error('Error updating permission', error);
        throw new Error('Failed to update permission');
    }

    // Full revalidation to ensure sidebar and access checks are immediately updated
    revalidatePath('/', 'layout');
}

/**
 * Helper function to check if the current user has access to a specific module.
 * Used for protecting routes and UI actions.
 */
export async function checkPermission(moduleName: string, action: 'can_view' | 'can_edit' = 'can_view'): Promise<boolean> {
    const role = await getCurrentUserRole();
    
    // Super Admin always has full access
    if (role === 'super_admin') return true;
    if (!role) return false;

    // Check the DB
    const supabase = await getSupabaseAdmin();
    const { data: permission } = await supabase
        .from('role_permissions')
        .select('can_view, can_edit')
        .eq('role_name', role)
        .eq('module_name', moduleName)
        .single();

    if (!permission) return false;

    return action === 'can_edit' ? permission.can_edit : permission.can_view;
}
