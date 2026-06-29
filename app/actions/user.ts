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
export async function inviteUser(email: string, role: string, options?: { skipEmail?: boolean; fullName?: string; phone?: string; locale?: string }) {
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
        // Priority 1: User defined site URL
        if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
        
        // Priority 2: Vercel specific environment variables
        // Note: VERCEL_PROJECT_PRODUCTION_URL is usually better as it points to the custom domain
        const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
        const vercelUrl = process.env.VERCEL_URL;
        
        if (vercelProductionUrl) return `https://${vercelProductionUrl}`;
        if (vercelUrl) return `https://${vercelUrl}`;
        
        // Fallback for local development
        return 'http://localhost:3000';
    };
    const baseUrl = getBaseUrl();
    
    // Include the email in the redirect URL for the set-password page to identify the invitee
    const redirectTo = `${baseUrl}/api/auth/confirm?next=/set-password&email=${encodeURIComponent(email)}`;
    
    console.log(`[Invite] Generating invite for ${email} with redirectTo: ${redirectTo}`);
    console.log(`[Invite] Env Check - NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL}, VERCEL_URL: ${process.env.VERCEL_URL}`);

    let user = null;
    let actionLink = null;

    try {
        // If skipEmail is requested (user clicked "Generate Link Only"), we go straight to generateLink
        if (options?.skipEmail) {
            const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
                type: 'invite',
                email: email,
                options: {
                    data: { 
                        initial_role: role,
                        full_name: options?.fullName,
                        phone: options?.phone
                    },
                    redirectTo: redirectTo
                }
            });

            if (linkError) throw linkError;

            user = linkData.user;
            actionLink = linkData.properties.action_link;
        } else if (role === 'owner') {
            // Owners receive a branded Lovely Memories invite (not Supabase's default template).
            // We still create the auth user via generateLink (so the role can be assigned and a
            // session minted later), but we DON'T email Supabase's token — it expires in <=24h.
            const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
                type: 'invite',
                email: email,
                options: {
                    data: { initial_role: role, full_name: options?.fullName, phone: options?.phone },
                    redirectTo: redirectTo
                }
            });

            if (linkError) throw linkError;

            user = linkData.user;
            const inviteLocale = options?.locale === 'en' ? 'en' : 'pt';
            // Long-lived, single-use link: the email carries OUR token (30-day validity we control
            // — see lib/invite-tokens.ts), redeemed via the scanner-safe /confirm interstitial.
            // Decouples the link's lifetime from Supabase's 24h OTP cap (see redeemInviteToken).
            const { createOwnerInvite, buildOwnerInviteLink } = await import('@/lib/invite-tokens');
            const rawToken = await createOwnerInvite({ email, userId: user?.id });
            const inviteLink = buildOwnerInviteLink(baseUrl, inviteLocale, rawToken, email);

            const { sendEmail } = await import('@/lib/email');
            const { ownerInviteEmail } = await import('@/lib/email-templates');

            const emailResult = await sendEmail({
                to: email,
                subject: inviteLocale === 'en'
                    ? 'Welcome to the Lovely Memories Owner Portal'
                    : 'Bem-vindo ao Portal de Proprietário | Lovely Memories',
                html: ownerInviteEmail({ fullName: options?.fullName, link: inviteLink, email }, inviteLocale)
            });

            // If our branded email failed to send, surface the link so the admin can share it manually.
            if (!emailResult.success) actionLink = inviteLink;
        } else {
            // Normal flow: try to send email first
            const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
                data: { 
                    initial_role: role,
                    full_name: options?.fullName,
                    phone: options?.phone
                },
                redirectTo: redirectTo
            });

            if (error) {
                // If rate limited, fallback to just generating the link instead
                if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
                    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
                        type: 'invite',
                        email: email,
                        options: {
                            data: { 
                                initial_role: role,
                                full_name: options?.fullName,
                                phone: options?.phone
                            },
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

        // SECURITY: Server-authoritative role assignment.
        // The DB trigger (handle_new_user) intentionally defaults every new profile to 'user'
        // and does NOT trust client-supplied user_metadata.initial_role (that would allow
        // self-signup privilege escalation). The role is therefore set here, after the invite
        // created the auth user, using the service-role client which has already verified the
        // caller is an admin/super_admin above.
        if (user?.id) {
            const { error: roleError } = await adminSupabase
                .from('profiles')
                .update({ role, full_name: options?.fullName, phone: options?.phone })
                .eq('id', user.id);
            if (roleError) {
                console.error('SERVER ACTION ERROR [Invite Role Assignment]:', roleError);
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
                { email, role, fullName: options?.fullName, phone: options?.phone, skipEmail: options?.skipEmail }
            );
        }

    } catch (err: any) {
        throw err;
    }

    revalidatePath('/[locale]/admin/users', 'page');
    return { success: true, user, actionLink };
}

/**
 * Resend an access link to an EXISTING owner, using our branded email.
 * A normal invite (type 'invite') fails for users that already exist, so we generate a
 * recovery link — it routes through /api/auth/confirm -> /set-password just like the invite —
 * and send the branded ownerInviteEmail via Resend.
 */
export async function resendOwnerInvite(email: string, locale: string = 'pt') {
    const isAuthorized = await checkRole(['super_admin', 'admin']);
    if (!isAuthorized) throw new Error('Not authorized to resend invites');

    if (!email) return { success: false, error: 'Missing email' };

    const adminSupabase = await getSupabaseAdmin();

    const getBaseUrl = () => {
        if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
        const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
        const vercelUrl = process.env.VERCEL_URL;
        if (vercelProductionUrl) return `https://${vercelProductionUrl}`;
        if (vercelUrl) return `https://${vercelUrl}`;
        return 'http://localhost:3000';
    };
    const baseUrl = getBaseUrl();
    const inviteLocale = locale === 'en' ? 'en' : 'pt';

    // The owner already exists — look up their id (to mint a session at redemption) and name.
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .single();
    if (!profile?.id) return { success: false, error: 'Owner not found' };

    // Long-lived, single-use link: same mechanism as a fresh invite. The email carries OUR token
    // (30-day validity we control), redeemed via the scanner-safe /confirm interstitial — never
    // Supabase's <=24h action_link. See lib/invite-tokens.ts + redeemInviteToken.
    const { createOwnerInvite, buildOwnerInviteLink } = await import('@/lib/invite-tokens');
    const rawToken = await createOwnerInvite({ email, userId: profile.id });
    const inviteLink = buildOwnerInviteLink(baseUrl, inviteLocale, rawToken, email);

    const { sendEmail } = await import('@/lib/email');
    const { ownerInviteEmail } = await import('@/lib/email-templates');

    const emailResult = await sendEmail({
        to: email,
        subject: inviteLocale === 'en'
            ? 'Welcome to the Lovely Memories Owner Portal'
            : 'Bem-vindo ao Portal de Proprietário | Lovely Memories',
        html: ownerInviteEmail({ fullName: profile?.full_name || undefined, link: inviteLink, email }, inviteLocale)
    });

    if (!emailResult.success) {
        return { success: false, error: emailResult.error || 'Failed to send email' };
    }

    // Audit log (best-effort).
    try {
        const supabase = await getSupabase();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            await logActivity(currentUser.id, 'INVITE', 'USER', email, { email, resend: true, locale: inviteLocale });
        }
    } catch (logErr) {
        console.error('Failed to audit log resend invite:', logErr);
    }

    return { success: true };
}

/**
 * Set (reset) an owner's password directly from the admin UI. Admin/super_admin only.
 *
 * This is the bullet-proof unblock path when an owner is stuck on the invite/recovery
 * email flow (token consumed by a scanner, old link, etc.): no email, no single-use token.
 * The admin types a password, we set it via the service-role Admin API, force-confirm the
 * account, and the owner changes it themselves after logging in.
 */
export async function setOwnerPassword(ownerId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await getSupabase();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();
        if (!currentProfile || (currentProfile.role !== 'super_admin' && currentProfile.role !== 'admin')) {
            return { success: false, error: 'Not authorized to reset passwords' };
        }

        // Same complexity rules enforced everywhere else in the app.
        const isComplexityMet =
            newPassword.length >= 8 && /\d/.test(newPassword) && /[a-zA-Z]/.test(newPassword);
        if (!isComplexityMet) {
            return { success: false, error: 'Password must be at least 8 characters and include a letter and a number' };
        }

        const adminSupabase = await getSupabaseAdmin();

        // Only owners can be reset through this path (admins/super_admins are out of scope here).
        const { data: target, error: targetError } = await adminSupabase
            .from('profiles')
            .select('role, email')
            .eq('id', ownerId)
            .single();
        if (targetError || !target) return { success: false, error: 'Owner not found' };
        if (target.role !== 'owner') return { success: false, error: 'This user is not an owner' };

        const { error } = await adminSupabase.auth.admin.updateUserById(ownerId, {
            password: newPassword,
            email_confirm: true, // force-confirm so the owner can log in straight away
        });
        if (error) return { success: false, error: error.message };

        await logActivity(
            currentUser.id,
            'UPDATE',
            'USER',
            ownerId,
            { field: 'password', target_email: target.email, method: 'admin_set' },
            'WARNING'
        );

        return { success: true };
    } catch (err: any) {
        console.error('SERVER ACTION ERROR [setOwnerPassword]:', err);
        return { success: false, error: err?.message || 'Failed to set password' };
    }
}

/**
 * Delete an owner — ONLY allowed when they have no properties assigned.
 * Admin/super_admin only. The 0-properties rule is enforced server-side (not just in the UI).
 */
export async function deleteOwner(ownerId: string, locale: string = 'en') {
    // Localized error messages so the UI surfaces them in the admin's language.
    const tr = (pt: string, en: string) => (locale === 'pt' ? pt : en);

    const supabase = await getSupabase();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error(tr('Sessão não iniciada', 'Not authenticated'));
    if (currentUser.id === ownerId) throw new Error(tr('Não pode eliminar a sua própria conta', 'You cannot delete your own account'));

    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();
    if (!currentProfile || (currentProfile.role !== 'super_admin' && currentProfile.role !== 'admin')) {
        throw new Error(tr('Sem autorização para eliminar proprietários', 'Not authorized to delete owners'));
    }

    const adminSupabase = await getSupabaseAdmin();

    const { data: target } = await adminSupabase
        .from('profiles')
        .select('role, email')
        .eq('id', ownerId)
        .single();
    if (!target) throw new Error(tr('Proprietário não encontrado', 'Owner not found'));
    if (target.role !== 'owner') throw new Error(tr('Este utilizador não é um proprietário', 'This user is not an owner'));

    // INTEGRITY: refuse to delete an owner that still has properties assigned.
    const { count, error: countError } = await adminSupabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', ownerId);
    if (countError) throw new Error(tr('Não foi possível verificar os imóveis do proprietário', 'Could not verify owner properties'));
    if ((count || 0) > 0) {
        throw new Error(tr('O proprietário ainda tem imóveis associados. Remova-os ou reatribua-os primeiro.', 'Owner still has properties assigned. Remove or reassign them first.'));
    }

    const { error } = await adminSupabase.auth.admin.deleteUser(ownerId);
    if (error) throw error;

    await logActivity(
        currentUser.id,
        'DELETE',
        'USER',
        ownerId,
        { target_email: target.email, target_role: 'owner' },
        'CRITICAL'
    );

    revalidatePath('/[locale]/admin/owners', 'page');
    return { success: true };
}

/**
 * Update the password for the currently authenticated user
 */
export async function updateUserPassword(password: string) {
    const supabase = await getSupabase();

    // Server-side validation for password complexity
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const isComplexityMet = hasMinLength && hasNumber && hasLetter;

    if (!isComplexityMet) {
        throw new Error('Password does not meet security requirements: at least 8 characters, one letter and one number.');
    }

    // 1. Update the password
    const { data: { user }, error } = await supabase.auth.updateUser({
        password: password
    });

    if (error) throw error;

    // 2. Safety Fallback: Sync name/phone from invite metadata if missing.
    // SECURITY: We deliberately do NOT elevate the role from user_metadata here.
    // Roles are assigned server-side at invite time (see inviteUser) and the DB trigger
    // defaults new profiles to 'user'. Trusting user_metadata.initial_role here would
    // re-introduce the self-signup privilege-escalation path.
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        const fullName = user.user_metadata?.full_name;
        const phone = user.user_metadata?.phone;

        const updates: any = {};
        if (profile && !profile.full_name && fullName) {
            updates.full_name = fullName;
        }
        if (profile && !profile.phone && phone) {
            updates.phone = phone;
        }

        if (Object.keys(updates).length > 0) {
            const adminSupabase = await getSupabaseAdmin();
            await adminSupabase
                .from('profiles')
                .update(updates)
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
        .select('owner_id, is_multi_unit')
        .in('owner_id', ownerIds);

    if (propsError) {
        console.error('Error fetching property counts:', propsError);
        // We can continue with 0 counts if this fails, but better to know
    }

    // Fetch creation dates via the Auth Admin API. The `auth` schema is NOT exposed over
    // PostgREST (it would error PGRST106), so we use listUsers() and map by id.
    const adminSupabase = await getSupabaseAdmin();
    const createdAtMap: Record<string, string> = {};
    try {
        const ownerIdSet = new Set(ownerIds);
        const perPage = 1000;
        // Page through auth users until everyone is covered (capped for safety).
        for (let page = 1; page <= 10; page++) {
            const { data: list, error: authError } = await adminSupabase.auth.admin.listUsers({ page, perPage });
            if (authError) {
                console.error('Error fetching auth users:', authError);
                break;
            }
            const users = list?.users || [];
            users.forEach((u) => {
                if (ownerIdSet.has(u.id)) createdAtMap[u.id] = u.created_at;
            });
            if (users.length < perPage) break; // reached the last page
        }
    } catch (authErr) {
        console.error('Error fetching auth users:', authErr);
    }

    // Aggregate counts
    const counts: Record<string, { total: number }> = {};
    properties?.forEach((p) => {
        if (p.owner_id && !p.is_multi_unit) {
            if (!counts[p.owner_id]) {
                counts[p.owner_id] = { total: 0 };
            }
            counts[p.owner_id].total++;
        }
    });

    // Map counts and dates to owners
    return owners.map(owner => {
        const ownerCounts = counts[owner.id] || { total: 0 };
        return {
            ...owner,
            created_at: createdAtMap[owner.id] || owner.updated_at,
            property_count: ownerCounts.total,
            buildings_count: 0,
            units_count: ownerCounts.total
        };
    });
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
