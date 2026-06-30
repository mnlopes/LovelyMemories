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
    details: unknown;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    actor?: Profile; // Joined field
}

export interface RolePermission {
    id: string;
    role_name: AppRole;
    module_name: string;
    can_view: boolean;
    can_edit: boolean;
    created_at: string;
    updated_at: string;
}

export interface Faq {
    id?: string;
    question: string;
    answer: string;
    locale: string;
    display_order: number;
    created_at?: string;
    updated_at?: string;
}

export interface CmsPageSection {
    id?: string;
    page_slug: string;
    title: string;
    content: string;
    icon: string;
    display_order: number;
    locale: string;
    list_items: { label: string; desc: string; }[];
    // About Us page extensions (null for terms/privacy sections)
    section_type?: string; // 'hero' | 'intro' | 'timeline'
    subtitle?: string;     // timeline "year" badge
    image_url?: string;    // hero background / timeline image
    video_url?: string;    // optional hero looping background video
    created_at?: string;
    updated_at?: string;
}

