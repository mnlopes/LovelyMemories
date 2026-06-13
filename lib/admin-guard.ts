import { redirect } from "next/navigation";
import { checkPermission } from "@/app/actions/permissions";
import { getCurrentUserRole } from "@/app/actions/user";

/**
 * Server-side authorization guards for admin route segments.
 *
 * These are used in per-segment `layout.tsx` files so that access control is enforced
 * on the SERVER (not just hidden in the sidebar). They mirror the visibility logic in
 * components/admin/AdminSidebar.tsx, so legitimate users see no behaviour change — but a
 * user who types a forbidden URL (e.g. an editor visiting /admin/finances) is redirected.
 *
 * super_admin always passes (checkPermission returns true for super_admin).
 *
 * Anti-loop note: denied users are sent to /admin/properties by default. The `properties`
 * guard itself must pass a different target (the public home) to avoid a redirect loop,
 * since /admin redirects non-super_admins to /admin/properties.
 */
export async function guardModule(moduleName: string, locale: string, denyTo?: string) {
    const allowed = await checkPermission(moduleName, "can_view");
    if (!allowed) redirect(denyTo ?? `/${locale}/admin/properties`);
}

export async function guardRoles(roles: string[], locale: string, denyTo?: string) {
    const role = await getCurrentUserRole();
    if (!role || !roles.includes(role)) redirect(denyTo ?? `/${locale}/admin/properties`);
}
