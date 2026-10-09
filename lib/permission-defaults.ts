// Partilhado entre server actions e componentes cliente — por isso vive fora de
// app/actions/permissions.ts (um ficheiro 'use server' só pode exportar funções async).

export type PermissionFlags = { can_view: boolean; can_edit: boolean };

/** Roles geridos pela matriz Roles & Permissions (super_admin passa sempre). */
export const MATRIX_ROLES = ['admin', 'editor', 'owner'] as const;

/** Módulos geridos pela matriz. `viewOnly`: o módulo não tem nada para editar. */
export const PERMISSION_MODULES: { id: string; label: string; viewOnly?: boolean }[] = [
    { id: 'overview', label: 'Overview', viewOnly: true },
    { id: 'properties', label: 'Properties Management' },
    { id: 'bookings', label: 'Bookings Management' },
    { id: 'owners', label: 'Property Owners' },
    { id: 'concierge', label: 'Concierge Management' },
    { id: 'content', label: 'Content (Blog, FAQ, Pages)' },
    { id: 'coupons', label: 'Coupons Management' },
    { id: 'imports', label: 'Airbnb Imports' },
    { id: 'team', label: 'Team & Access' },
];

// Overview e Content entraram na matriz depois do seed inicial (2026-10-09). Até existir
// a linha em role_permissions (migração 20261009120000 por aplicar, ou toggle nunca
// clicado) vale este default, que espelha o acesso que o código dava antes: admin sim,
// os outros roles não.
const MODULE_DEFAULTS: Record<string, Partial<Record<string, PermissionFlags>>> = {
    overview: { admin: { can_view: true, can_edit: true } },
    content: { admin: { can_view: true, can_edit: true } },
};

/** Permissão a usar quando não existe linha em role_permissions para (role, módulo). */
export function defaultPermission(role: string | null | undefined, moduleName: string): PermissionFlags {
    return (role && MODULE_DEFAULTS[moduleName]?.[role]) || { can_view: false, can_edit: false };
}
