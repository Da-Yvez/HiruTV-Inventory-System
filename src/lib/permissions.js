import { useAuth } from '@/context/AuthContext';

/**
 * Full list of permission keys with human-readable labels.
 * Used for the user management form and permission checks everywhere.
 */
export const PERMISSIONS = [
    { key: 'canAccessWTC',          label: 'WTC: Access Site',      description: 'Can enter the WTC inventory' },
    { key: 'wtc_canAdd',            label: 'WTC: Add Items',        description: 'Can add devices in WTC' },
    { key: 'wtc_canEdit',           label: 'WTC: Edit Items',       description: 'Can edit devices in WTC' },
    { key: 'wtc_canDelete',         label: 'WTC: Delete Items',     description: 'Can delete devices in WTC' },
    
    { key: 'canAccessHLS',          label: 'HLS: Access Site',      description: 'Can enter the HLS inventory' },
    { key: 'hls_canAdd',            label: 'HLS: Add Items',        description: 'Can add devices in HLS' },
    { key: 'hls_canEdit',           label: 'HLS: Edit Items',       description: 'Can edit devices in HLS' },
    { key: 'hls_canDelete',         label: 'HLS: Delete Items',     description: 'Can delete devices in HLS' },

    { key: 'canViewLogs',           label: 'View Activity Logs',    description: 'Can view the activity log history' },
    { key: 'canManageDepartments',  label: 'Manage Departments',    description: 'Can add / edit / remove departments' },
];

/**
 * Default permissions for a brand-new user (no access by default).
 */
export const DEFAULT_PERMISSIONS = {
    canAccessWTC:           false,
    wtc_canAdd:             false,
    wtc_canEdit:            false,
    wtc_canDelete:          false,
    canAccessHLS:           false,
    hls_canAdd:             false,
    hls_canEdit:            false,
    hls_canDelete:          false,
    canViewLogs:            false,
    canManageDepartments:   false,
};

/**
 * Check if a user object has a given permission.
 * Admins automatically pass every check.
 * If site is provided, it checks for site-prefixed permission.
 */
export function hasPermission(user, key, site = null) {
    if (!user) return false;
    if (user.isAdmin) return true;
    
    // If it's a site-aware action (add/edit/delete)
    if (site && (key === 'canAdd' || key === 'canEdit' || key === 'canDelete')) {
        const sitePrefixedKey = `${site.id}_${key}`;
        return user.permissions?.[sitePrefixedKey] === true;
    }

    return user.permissions?.[key] === true;
}

/**
 * React hook — returns true/false for the current logged-in user.
 * Usage: const canEdit = usePermission('canEdit', currentSite);
 */
export function usePermission(key, site = null) {
    const { user } = useAuth();
    return hasPermission(user, key, site);
}
