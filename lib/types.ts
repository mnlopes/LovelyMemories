export type AppRole = 'super_admin' | 'admin' | 'editor' | 'user' | 'owner';

export interface Profile {
    id: string;
    email: string | null;
    role: AppRole;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    updated_at: string;
}

export interface AuditLog {
    id: string;
    created_at: string;
    actor_id: string | null;
    action_type: string;
    resource_type: string;
    resource_id: string | null;
    details: any;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    actor?: Profile; // Joined field
}
