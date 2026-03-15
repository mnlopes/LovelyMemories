'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logActivity } from './audit';

/**
 * Get a Supabase server client for internal use
 */
async function getSupabase() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );
}

/**
 * Check if the current user has a specific role
 */
async function checkRole(allowedRoles: string[]) {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile && allowedRoles.includes(profile.role);
}

/**
 * Fetch all user profiles (Admin/SuperAdmin only)
 */
export async function getProfiles() {
    const supabase = await getSupabase();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) throw new Error('Not authenticated');

    // Get requester's profile to check role
    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (!requesterProfile || (requesterProfile.role !== 'super_admin' && requesterProfile.role !== 'admin')) {
        throw new Error('Not authorized to view team members');
    }

    const isSuperAdmin = requesterProfile.role === 'super_admin';

    let query = supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: false });

    // Admins cannot see Super Admins
    if (!isSuperAdmin) {
        query = query.neq('role', 'super_admin');
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
}

/**
 * Update a user's profile details (Name, Email, Phone)
 */
export async function updateUserProfile(userId: string, data: { fullName: string; email: string; phone: string }) {
    const supabase = await getSupabase();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) throw new Error('Not authenticated');

    // Get current user's role
    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', currentUser.id)
        .single();

    if (!currentProfile) throw new Error('Current user profile not found');

    // Get target user
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (!targetProfile) throw new Error('Target user profile not found');

    const isSuperAdmin = currentProfile.role === 'super_admin';
    const isAdmin = currentProfile.role === 'admin';

    // Hierarchy protection logic
    if (!isSuperAdmin) {
        if (!isAdmin) {
            throw new Error('Not authorized to edit users');
        }

        // Admins CANNOT edit super_admins
        if (targetProfile.role === 'super_admin') {
            throw new Error('You do not have permission to edit a Super Admin');
        }
    }

    // 1. Update Profile Data (Name, Phone)
    // Use admin client to bypass potentially restrictive RLS on 'profiles' update
    const adminSupabase = await getSupabaseAdmin();

    const { error: profileError } = await adminSupabase
        .from('profiles')
        .update({
            full_name: data.fullName,
            phone: data.phone,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    if (profileError) {
        console.error("SERVER ACTION ERROR [Profile Update]:", profileError);
        throw new Error(`Profile Update Failed: ${profileError.message} (Code: ${profileError.code})`);
    }

    // 2. Update Email in Auth (if changed)
    // Only Admin/SuperAdmin can trigger this via Admin API
    if (data.email !== targetProfile.email) {
        // Reuse adminSupabase client declared above

        const { error: authError } = await adminSupabase.auth.admin.updateUserById(userId, {
            email: data.email,
            user_metadata: { full_name: data.fullName } // Also sync metadata
        });

        if (authError) {
            console.error("SERVER ACTION ERROR [Auth Update]:", authError);
            throw new Error(`Auth Update Failed: ${authError.message}`);
        }

        // Also update email in profiles table manually if the trigger doesn't handle it immediately
        const { error: syncError } = await supabase.from('profiles').update({ email: data.email }).eq('id', userId);
        if (syncError) {
            console.error("SERVER ACTION ERROR [Profile Email Sync]:", syncError);
        }
    }

    // Log Profile Update
    await logActivity(
        currentUser.id,
        'UPDATE',
        'USER',
        userId,
        {
            field: 'profile',
            changes: data,
            previous_email: targetProfile.email
        }
    );

    revalidatePath('/[locale]/admin/users', 'page');
    return { success: true };
}

/**
 * Update a user's role with hierarchy protection
 */
export async function updateUserRole(userId: string, newRole: string) {
    const supabase = await getSupabase();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) throw new Error('Not authenticated');

    // Get current user's role
    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (!currentProfile) throw new Error('Current user profile not found');

    // Get target user's role
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (!targetProfile) throw new Error('Target user profile not found');

    const isSuperAdmin = currentProfile.role === 'super_admin';
    const isAdmin = currentProfile.role === 'admin';

    // Hierarchy protection logic
    if (!isSuperAdmin) {
        if (!isAdmin) {
            throw new Error('Not authorized to change roles');
        }

        // Admins CANNOT touch super_admins
        if (targetProfile.role === 'super_admin') {
            throw new Error('You do not have permission to manage a Super Admin');
        }

        // Admins CANNOT promote anyone to super_admin
        if (newRole === 'super_admin') {
            throw new Error('Only a Super Admin can assign the Super Admin role');
        }
    }

    const adminSupabase = await getSupabaseAdmin();
    const { error } = await adminSupabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

    if (error) throw error;

    // Log Role Update
    await logActivity(
        currentUser.id,
        'UPDATE',
        'USER',
        userId,
        { field: 'role', old_role: targetProfile.role, new_role: newRole },
        'WARNING' // Changing roles is sensitive
    );

    revalidatePath('/[locale]/admin/users', 'page');
    return { success: true };
}

/**
 * Invite a new user via email
 */
export async function inviteUser(email: string, role: string, options?: { skipEmail?: boolean }) {
    const isAuthorized = await checkRole(['super_admin', 'admin']);
    if (!isAuthorized) {
        throw new Error('Not authorized to invite users');
    }

    const supabase = await getSupabase();

    // Safety check: only super_admin can invite another super_admin
    if (role === 'super_admin') {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser?.id)
            .single();

        if (currentProfile?.role !== 'super_admin') {
            throw new Error('Only Super Admins can invite other Super Admins');
        }
    }

    // Now use the ADMIN client for the actual invite
    const adminSupabase = await getSupabaseAdmin();

    // Determine the base URL for redirection
    const getBaseUrl = () => {
        if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
        if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
        if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
        return 'http://localhost:3000';
    };
    const baseUrl = getBaseUrl();
    
    // Include the email in the redirect URL for the set-password page to identify the invitee
    const redirectTo = `${baseUrl}/api/auth/confirm?next=/set-password&email=${encodeURIComponent(email)}`;

    let user = null;
    let actionLink = null;

    try {
        // If skipEmail is requested (user clicked "Generate Link Only"), we go straight to generateLink
        if (options?.skipEmail) {
            const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
                type: 'invite',
                email: email,
                options: {
                    data: { initial_role: role },
                    redirectTo: redirectTo
                }
            });

            if (linkError) throw linkError;

            user = linkData.user;
            actionLink = linkData.properties.action_link;
        } else {
            // Normal flow: try to send email first
            const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
                data: { initial_role: role },
                redirectTo: redirectTo
            });

            if (error) {
                // If rate limited, fallback to just generating the link instead
                if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
                    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
                        type: 'invite',
                        email: email,
                        options: {
                            data: { initial_role: role },
                            redirectTo: redirectTo
                        }
                    });

                    if (linkError) throw linkError;

                    user = linkData.user;
                    actionLink = linkData.properties.action_link;
                } else {
                    throw error;
                }
            } else {
                user = data.user;
            }
        }

        // Get actor ID for logging
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            await logActivity(
                currentUser.id,
                'INVITE',
                'USER',
                user?.id || 'pending',
                { email, role, skipEmail: options?.skipEmail }
            );
        }

    } catch (err: any) {
        throw err;
    }

    revalidatePath('/[locale]/admin/users', 'page');
    return { success: true, user, actionLink };
}

/**
 * Update the password for the currently authenticated user
 */
export async function updateUserPassword(password: string) {
    const supabase = await getSupabase();

    // 1. Update the password
    const { data: { user }, error } = await supabase.auth.updateUser({
        password: password
    });

    if (error) throw error;

    // 2. Safety Fallback: Ensure the profile has the correct role 
    // (In case the SQL trigger wasn't updated/applied)
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const initialRole = user.user_metadata?.initial_role;

        // If the profile is still 'user' but the metadata says otherwise, we update it
        if (profile && profile.role === 'user' && initialRole && initialRole !== 'user') {
            const adminSupabase = await getSupabaseAdmin();
            await adminSupabase
                .from('profiles')
                .update({ role: initialRole })
                .eq('id', user.id);
        }
    }

    return { success: true };
}

/**
 * Delete a user from both Auth and Profiles
 */
export async function deleteUser(userId: string) {
    try {
        const supabase = await getSupabase();
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) throw new Error('Not authenticated');
        if (currentUser.id === userId) throw new Error('You cannot delete your own account');

        // Get current user's role
        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

        if (!currentProfile) throw new Error('Current user profile not found');

        // Get target user's role
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('role, email')
            .eq('id', userId)
            .single();

        if (!targetProfile) throw new Error('Target user profile not found');

        const isSuperAdmin = currentProfile.role === 'super_admin';
        const isAdmin = currentProfile.role === 'admin';

        // Hierarchy protection logic
        if (!isSuperAdmin) {
            if (!isAdmin) {
                throw new Error('Not authorized to delete users');
            }

            // Admins CANNOT delete super_admins or other admins
            const isTargetProtected = targetProfile.role === 'super_admin' || targetProfile.role === 'admin';
            if (isTargetProtected) {
                throw new Error('You do not have permission to delete this user');
            }
        }

        // Use ADMIN client to delete from Supabase Auth
        const adminSupabase = await getSupabaseAdmin();
        const { error } = await adminSupabase.auth.admin.deleteUser(userId);

        if (error) throw error;

        // Log Deletion
        await logActivity(
            currentUser.id,
            'DELETE',
            'USER',
            userId,
            { target_email: targetProfile.email, target_role: targetProfile.role },
            'CRITICAL'
        );

        revalidatePath('/[locale]/admin/users', 'page');
        return { success: true };
    } catch (error: any) {
        console.error("SERVER ACTION ERROR [Delete User]:", error);
        return { success: false, error: error.message || 'Failed to delete user' };
    }
}


/**
 * Fetch all users with the 'owner' role for property assignment
 */
export async function getOwners() {
    const supabase = await getSupabase();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) throw new Error('Not authenticated');

    // Get requester's profile to check role
    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (!requesterProfile || (requesterProfile.role !== 'super_admin' && requesterProfile.role !== 'admin')) {
        throw new Error('Not authorized to view owners');
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'owner')
        .order('full_name', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Fetch all owners with the count of assigned properties
 */
export async function getOwnersWithPropertyCounts() {
    const supabase = await getSupabase();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) throw new Error('Not authenticated');

    // Get requester's profile to check role
    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (!requesterProfile || (requesterProfile.role !== 'super_admin' && requesterProfile.role !== 'admin')) {
        throw new Error('Not authorized to view owners');
    }

    const { data: owners, error: ownersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'owner')
        .order('full_name', { ascending: true });

    if (ownersError) {
        console.error('Error fetching owners:', ownersError);
        throw new Error(`Failed to fetch owners: ${ownersError.message} (${ownersError.code})`);
    }

    // If no owners, return empty early
    if (!owners || owners.length === 0) return [];

    // Fetch properties to count them
    const ownerIds = owners.map(o => o.id);
    const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('owner_id')
        .in('owner_id', ownerIds);

    if (propsError) {
        console.error('Error fetching property counts:', propsError);
        // We can continue with 0 counts if this fails, but better to know
    }

    // Fetch creation dates from auth.users using Admin client
    const adminSupabase = await getSupabaseAdmin();
    // We cannot easily query auth.users with select().in() usually, 
    // so we attempt to list users or just use updated_at as fallback if this is too complex/slow.
    // However, for a list of owners, we can fetch them. 
    // Trying the schema 'auth' approach which works with Service Role key.
    const { data: authUsers, error: authError } = await adminSupabase
        .schema('auth')
        .from('users')
        .select('id, created_at')
        .in('id', ownerIds);

    const createdAtMap: Record<string, string> = {};
    if (authUsers) {
        authUsers.forEach((u: any) => {
            createdAtMap[u.id] = u.created_at;
        });
    } else if (authError) {
        console.error('Error fetching auth users:', authError);
    }

    // Aggregate counts
    const counts: Record<string, number> = {};
    properties?.forEach((p) => {
        if (p.owner_id) {
            counts[p.owner_id] = (counts[p.owner_id] || 0) + 1;
        }
    });

    // Map counts and dates to owners
    return owners.map(owner => ({
        ...owner,
        created_at: createdAtMap[owner.id] || owner.updated_at, // Fallback to updated_at if fetch fails
        property_count: counts[owner.id] || 0
    }));
}

/**
 * Fetch a specific owner with their assigned properties
 */
export async function getOwnerWithProperties(ownerId: string) {
    const supabase = await getSupabase();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) throw new Error('Not authenticated');

    // Get requester's profile to check role
    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (!requesterProfile || (requesterProfile.role !== 'super_admin' && requesterProfile.role !== 'admin')) {
        throw new Error('Not authorized to view owners');
    }

    // 1. Fetch Owner Profile
    const { data: owner, error: ownerError } = await supabase
        .from('profiles')
        .select(`
            id, 
            full_name, 
            email, 
            phone,
            role
        `)
        .eq('id', ownerId)
        .eq('role', 'owner')
        .single();

    if (ownerError) {
        console.error('Error fetching owner profile:', ownerError);
        throw ownerError;
    }

    // 2. Fetch Assigned Properties
    const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', ownerId);

    if (propsError) {
        console.error('Error fetching owner properties:', propsError);
        // We don't throw here, just return empty properties if this fails
    }

    return {
        ...owner,
        properties: properties || []
    };
}

/**
 * Get the current user's role
 */
export async function getCurrentUserRole() {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role || null;
}
