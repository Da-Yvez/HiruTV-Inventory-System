// Core permissions logic (shared between client and server)

/**
 * Full list of permission keys with human-readable labels.
 * Used for the user management form and permission checks everywhere.
 */
export const PERMISSIONS = [
    { key: 'canAccessWTC',          label: 'WTC: Access Site',      description: 'Can enter the WTC inventory' },
    { key: 'wtc_canAdd',            label: 'WTC: Add Items',        description: 'Can add devices in WTC' },
    { key: 'wtc_canEdit',           label: 'WTC: Edit Items',       description: 'Can edit devices in WTC' },
    { key: 'wtc_canDelete',         label: 'WTC: Delete Items',     description: 'Can delete devices in WTC' },
    
    { key: 'canAccessHLS',          label: 'Life Studio: Access Site',      description: 'Can enter the Life Studio inventory' },
    { key: 'hls_canAdd',            label: 'Life Studio: Add Items',        description: 'Can add devices in Life Studio' },
    { key: 'hls_canEdit',           label: 'Life Studio: Edit Items',       description: 'Can edit devices in Life Studio' },
    { key: 'hls_canDelete',         label: 'Life Studio: Delete Items',     description: 'Can delete devices in Life Studio' },
    
    { key: 'canAccessHLSE',          label: 'Life Studio Equipments: Access Site',      description: 'Can enter the Life Studio Equipments inventory' },
    { key: 'hlse_canAdd',            label: 'Life Studio Equipments: Add Items',        description: 'Can add items in Life Studio Equipments' },
    { key: 'hlse_canEdit',           label: 'Life Studio Equipments: Edit Items',       description: 'Can edit items in Life Studio Equipments' },
    { key: 'hlse_canDelete',         label: 'Life Studio Equipments: Delete Items',     description: 'Can delete items in Life Studio Equipments' },
    { key: 'hlse_canCreateSIO',      label: 'Life Studio Equipments: Create SIO',       description: 'Can create SIO forms in Life Studio Equipments' },
    { key: 'hlse_canApproveSIO',     label: 'Life Studio Equipments: Approve SIO',      description: 'Can approve SIO forms in Life Studio Equipments' },

    { key: 'canViewLogs',           label: 'View Activity Logs',    description: 'Can view the activity log history' },
    { key: 'canManageDepartments',  label: 'Manage Departments',    description: 'Can add / edit / remove departments' },

    { key: 'manage_wtc',            label: 'Manage WTC Users',      description: 'Can manage users and permissions for WTC' },
    { key: 'manage_hls',            label: 'Manage Life Studio Users', description: 'Can manage users and permissions for Life Studio' },
    { key: 'manage_hlse',           label: 'Manage Life Studio Equipments Users', description: 'Can manage users and permissions for Life Studio Equipments' },
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
    canAccessHLSE:          false,
    hlse_canAdd:            false,
    hlse_canEdit:           false,
    hlse_canDelete:         false,
    hlse_canCreateSIO:      false,
    hlse_canApproveSIO:     false,
    canViewLogs:            false,
    canManageDepartments:   false,
    manage_wtc:             false,
    manage_hls:             false,
    manage_hlse:            false,
};

/**
 * Check if a user object has a given permission.
 * Admins automatically pass every check.
 * If site is provided, it checks for site-prefixed permission.
 */
export function hasPermission(user, key, site = null) {
    if (!user) return false;
    
    // Super Admin has full access to EVERYTHING
    if (user.isSuperAdmin) return true;

    const siteId = site?.id || '';

    // Admin has access to site-prefixed actions if they have specific site management permission
    if (user.isAdmin) {
        // If checking for user management capabilities
        if (key === 'manage_wtc' || key === 'manage_hls' || key === 'manage_hlse') {
            return user.permissions?.[key] === true;
        }

        // If a site context is provided, they are a site admin only if they have manage_[siteId]
        if (siteId) {
            return user.permissions?.[`manage_${siteId}`] === true;
        }
        
        // Fallback for legacy admin
        return true;
    }
    
    // If it's a site-aware action
    if (site && (key === 'canAdd' || key === 'canEdit' || key === 'canDelete' || key === 'canCreateSIO' || key === 'canApproveSIO')) {
        const sitePrefixedKey = `${site.id}_${key}`;
        return user.permissions?.[sitePrefixedKey] === true;
    }

    return user.permissions?.[key] === true;
}
