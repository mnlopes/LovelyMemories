'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { RolePermission, AppRole } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getCurrentUserRole } from './user';
import { MATRIX_ROLES, PERMISSION_MODULES, defaultPermission } from '@/lib/permission-defaults';

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
 * Set one permission toggle by (role, module), creating the row if it doesn't exist yet
 * (modules added to the matrix after the initial seed, e.g. overview/content).
 * Restricted to super_admin and admin. Returns the stored row.
 */
export async function setRolePermission(
    roleName: string,
    moduleName: string,
    field: 'can_view' | 'can_edit',
    value: boolean
): Promise<RolePermission> {
    const role = await getCurrentUserRole();
    if (role !== 'super_admin' && role !== 'admin') {
        throw new Error('Not authorized to update permissions');
    }
    if (!(MATRIX_ROLES as readonly string[]).includes(roleName) || !PERMISSION_MODULES.some(m => m.id === moduleName)) {
        throw new Error('Unknown role or module');
    }
    if (field !== 'can_view' && field !== 'can_edit') {
        throw new Error('Unknown permission field');
    }

    const supabase = await getSupabaseAdmin();
    const { data: existing } = await supabase
        .from('role_permissions')
        .select('can_view, can_edit')
        .eq('role_name', roleName)
        .eq('module_name', moduleName)
        .maybeSingle();

    const current = existing ?? defaultPermission(roleName, moduleName);
    const { data, error } = await supabase
        .from('role_permissions')
        .upsert(
            { role_name: roleName, module_name: moduleName, can_view: current.can_view, can_edit: current.can_edit, [field]: value },
            { onConflict: 'role_name,module_name' }
        )
        .select('*')
        .single();

    if (error || !data) {
        console.error('Error setting permission', error);
        throw new Error('Failed to update permission');
    }

    revalidatePath('/', 'layout');
    return data as RolePermission;
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
        .maybeSingle();

    // No row yet (module added to the matrix after the seed) → the module's default.
    const effective = permission ?? defaultPermission(role, moduleName);

    return action === 'can_edit' ? effective.can_edit : effective.can_view;
}
