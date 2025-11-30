import { User, Tenant, CompanySettings, Propiedad, Propietario, Comprador } from '../types';
import { ROLE_DEFAULT_PERMISSIONS, DEMO_SEED, ROLE_MIGRATION_MAP, ROLES } from '../constants';

const SUPERADMIN_USERS_KEY = 'iange:superadmin:users';
const TENANTS_KEY = 'iange:tenants';
const TENANT_DATA_PREFIX = 'iange:tenant:';
const MIGRATION_FLAG_KEY = '__migrated_v2__';

type TenantDataKey = 'users' | 'properties' | 'contacts' | 'settings' | 'audit';

// Helper to safely parse currency strings
const parseCurrencyString = (value: string | undefined): number => {
    if (!value) return 0;
    // Remove non-numeric characters except for the decimal point
    const sanitized = value.toString().replace(/[^0-9.]/g, '');
    return parseFloat(sanitized);
};

const adapter = {
    // --- Password Utilities ---
    _hashPassword(password: string): string {
        try {
            // Simple non-secure hashing for demo purposes. Replace with a real library like bcrypt in production.
            return btoa(password);
        } catch (e) {
            console.error('Failed to hash password', e);
            return password;
        }
    },
    _verifyPassword(plain: string, hashed: string): boolean {
        return this._hashPassword(plain) === hashed;
    },

    // --- Generic Tenant Data Accessors ---
    getTenantData<T>(tenantId: string, key: TenantDataKey): T | null {
        const data = localStorage.getItem(`${TENANT_DATA_PREFIX}${tenantId}:${key}`);
        return data ? JSON.parse(data) : null;
    },
    setTenantData<T>(tenantId: string, key: TenantDataKey, data: T): void {
        localStorage.setItem(`${TENANT_DATA_PREFIX}${tenantId}:${key}`, JSON.stringify(data));
    },

    // --- Initialization & Migration ---
    initialize() {
        if (!localStorage.getItem(SUPERADMIN_USERS_KEY)) {
            const superAdmin: User = { 
                id: 1, 
                photo: 'AP', 
                name: 'Ariel Poggi', 
                email: 'superadmin@iange.xyz', 
                phone: '', 
                role: 'superadmin', 
                password: this._hashPassword('1234567890'),
                permissions: ROLE_DEFAULT_PERMISSIONS['superadmin'],
                tenantId: null,
            };
            localStorage.setItem(SUPERADMIN_USERS_KEY, JSON.stringify([superAdmin]));
        }
        if (!localStorage.getItem(TENANTS_KEY)) {
            localStorage.setItem(TENANTS_KEY, JSON.stringify([]));
        }

        // Create and seed demo tenant if it doesn't exist
        const tenants = this.listTenants();
        const demoTenant = tenants.find(t => t.id === '1');
        if (!demoTenant) {
            const demoTenantData: Tenant = {
                id: '1',
                nombre: 'Empresa de Prueba (Demo)',
                ownerEmail: 'empresaprueba@iange.xyz',
                telefono: '8187654321',
                fechaRegistro: new Date().toISOString(),
                estado: 'Activo',
            };
            tenants.push(demoTenantData);
            localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));

            const demoUsers = DEMO_SEED.users.map(u => ({ ...u, password: this._hashPassword('1234567890') }));
            this.setTenantData('1', 'users', demoUsers);
            this.setTenantData('1', 'properties', DEMO_SEED.propiedades);
            this.setTenantData('1', 'contacts', { propietarios: DEMO_SEED.propietarios, compradores: [] });
            this.setTenantData('1', 'settings', { onboarded: true });
        }
    },

    migrateData() {
        if (localStorage.getItem(MIGRATION_FLAG_KEY)) {
            return; // Migration already done
        }

        this.initialize(); // Ensure base data exists

        console.log("Running data migration v2...");

        // Migrate superadmin users
        let superAdmins = JSON.parse(localStorage.getItem(SUPERADMIN_USERS_KEY) || '[]') as User[];
        superAdmins = superAdmins.map(user => ({
            ...user,
            role: ROLE_MIGRATION_MAP[user.role] || user.role,
        }));
        localStorage.setItem(SUPERADMIN_USERS_KEY, JSON.stringify(superAdmins));

        // Migrate tenant users
        const tenants = this.listTenants();
        for (const tenant of tenants) {
            let users = this.listUsers(tenant.id);
            users = users.map(user => ({
                ...user,
                role: ROLE_MIGRATION_MAP[user.role] || user.role,
                tenantId: tenant.id, // Ensure tenantId is set
            }));
            this.setTenantData(tenant.id, 'users', users);
        }

        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        console.log("Migration complete.");
    },

    // --- Global Data Retrieval ---
    getAllCompanies(): Tenant[] {
        return this.listTenants();
    },

    getAllUsers(): User[] {
        const superAdmins = JSON.parse(localStorage.getItem(SUPERADMIN_USERS_KEY) || '[]') as User[];
        const tenantUsers = this.listTenants().flatMap(t => this.listUsers(t.id));
        return [...superAdmins, ...tenantUsers];
    },

    getAllProperties(): Propiedad[] {
        return this.listTenants().flatMap(t => this.listProperties(t.id));
    },

    getGlobalStats() {
        const allCompanies = this.getAllCompanies();
        const allUsers = this.getAllUsers();
        const allProperties = this.getAllProperties();
        
        const soldProperties = allProperties.filter(p => p.status === 'Vendida');
        
        const globalSales = soldProperties.length;
        const portfolioValue = allProperties.reduce((sum, p) => sum + parseCurrencyString(p.valor_operacion), 0);
        
        const rolesDistribution = allUsers.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalCompanies: allCompanies.length,
            totalUsers: allUsers.length,
            totalProperties: allProperties.length,
            globalSales,
            portfolioValue,
            rolesDistribution,
        };
    },

    // --- Tenant Management ---
    listTenants(): Tenant[] {
        const tenants = localStorage.getItem(TENANTS_KEY);
        return tenants ? JSON.parse(tenants) : [];
    },

    createTenant(tenantData: Pick<Tenant, 'nombre' | 'ownerEmail' | 'telefono'> & { initialPassword?: string, mustChangePassword?: boolean }): Tenant {
        const tenants = this.listTenants();
        if (tenants.some(t => t.nombre.toLowerCase() === tenantData.nombre.toLowerCase())) {
            throw new Error('Ya existe una empresa con ese nombre.');
        }
        if (this.findUserByEmail(tenantData.ownerEmail)) {
             throw new Error('El correo electrónico del owner ya está en uso en el sistema.');
        }

        const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newTenant: Tenant = {
            id: tenantId,
            nombre: tenantData.nombre,
            ownerEmail: tenantData.ownerEmail,
            telefono: tenantData.telefono,
            fechaRegistro: new Date().toISOString(),
            estado: 'Activo',
        };

        const ownerName = tenantData.nombre.split(' ')[0] || 'Admin';
        // Create owner user
        const ownerUser: Omit<User, 'id'> = {
            name: 'Administrador Principal',
            email: tenantData.ownerEmail,
            phone: tenantData.telefono || '',
            role: ROLES.EMPRESA,
            photo: ownerName.substring(0,2).toUpperCase(),
            password: tenantData.initialPassword || 'temporal123',
            mustChangePassword: tenantData.mustChangePassword ?? true,
            tenantId: tenantId,
            permissions: ROLE_DEFAULT_PERMISSIONS.empresa,
        };
        
        // Initialize tenant data stores
        this.setTenantData(tenantId, 'users', [this._createUser(ownerUser, tenantId)]);
        this.setTenantData(tenantId, 'properties', [] as Propiedad[]);
        this.setTenantData(tenantId, 'contacts', { propietarios: [] as Propietario[], compradores: [] as Comprador[] });
        this.setTenantData(tenantId, 'settings', { onboarded: false });
        this.setTenantData(tenantId, 'audit', []);

        tenants.push(newTenant);
        localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
        
        return newTenant;
    },

    updateTenant(tenantId: string, updatedData: Partial<Tenant>): Tenant | null {
        let tenants = this.listTenants();
        const tenantIndex = tenants.findIndex(t => t.id === tenantId);
        if (tenantIndex !== -1) {
            tenants[tenantIndex] = { ...tenants[tenantIndex], ...updatedData };
            localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
            return tenants[tenantIndex];
        }
        return null;
    },
    
    // --- User Management (Tenant-Aware) ---
    listUsers(tenantId: string): User[] {
        return (this.getTenantData(tenantId, 'users') as User[] | null) || [];
    },

    _createUser(userData: Omit<User, 'id'>, tenantId: string): User {
        const newUser: User = {
            ...userData,
            id: Date.now(),
            password: this._hashPassword(userData.password || ''),
            tenantId: tenantId,
        };
        return newUser;
    },
    
    createUser(tenantId: string, userData: Omit<User, 'id'>): User {
        const users = this.listUsers(tenantId);
        if (users.some(u => u.email === userData.email)) {
            throw new Error('El correo electrónico ya está en uso en esta empresa.');
        }
        const newUser = this._createUser(userData, tenantId);
        users.push(newUser);
        this.setTenantData(tenantId, 'users', users);
        return newUser;
    },
    
    updateUser(tenantId: string, userId: number, updatedData: Partial<User>): User | null {
        let users = this.listUsers(tenantId);
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            // Prevent password from being overwritten by partial update
            const { password, ...rest } = updatedData;
            users[userIndex] = { ...users[userIndex], ...rest };
            this.setTenantData(tenantId, 'users', users);
            return users[userIndex];
        }
        return null;
    },

    deleteUser(tenantId: string, userId: number): boolean {
        let users = this.listUsers(tenantId);
        const newUsers = users.filter(u => u.id !== userId);
        if (newUsers.length < users.length) {
            this.setTenantData(tenantId, 'users', newUsers);
            return true;
        }
        return false;
    },
    
    setPassword(tenantId: string | null, userId: number, newPassword: string, mustChange: boolean): boolean {
       const usersSource = tenantId ? this.listUsers(tenantId) : JSON.parse(localStorage.getItem(SUPERADMIN_USERS_KEY) || '[]');
       const userIndex = usersSource.findIndex((u: User) => u.id === userId);
       if (userIndex > -1) {
           usersSource[userIndex].password = this._hashPassword(newPassword);
           usersSource[userIndex].mustChangePassword = mustChange;
           if (tenantId) {
               this.setTenantData(tenantId, 'users', usersSource);
           } else {
               localStorage.setItem(SUPERADMIN_USERS_KEY, JSON.stringify(usersSource));
           }
           return true;
       }
       return false;
    },

    findUserByEmail(email: string): { user: User, tenantId: string | null } | null {
        // Check superadmins first
        const superAdmins: User[] = JSON.parse(localStorage.getItem(SUPERADMIN_USERS_KEY) || '[]');
        const superAdmin = superAdmins.find(u => u.email === email);
        if (superAdmin) {
            return { user: superAdmin, tenantId: null };
        }
        
        // Check all tenants
        const tenants = this.listTenants();
        for (const tenant of tenants) {
            if (tenant.estado === 'Suspendido') continue;
            const users = this.listUsers(tenant.id);
            const user = users.find(u => u.email === email);
            if (user) {
                return { user, tenantId: tenant.id };
            }
        }
        return null;
    },

    login(email: string, pass: string): { user: User } | null {
        const result = this.findUserByEmail(email);
        if (result && result.user.password && this._verifyPassword(pass, result.user.password)) {
             const finalUser = {
                ...result.user,
                permissions: result.user.permissions || ROLE_DEFAULT_PERMISSIONS[result.user.role],
                tenantId: result.tenantId, // Ensure tenantId is on the user object
            };
            return { user: finalUser };
        }
        return null;
    },

    // --- Company Settings Management ---
    getTenantSettings(tenantId: string): CompanySettings {
        return (this.getTenantData(tenantId, 'settings') as CompanySettings | null) || { onboarded: false };
    },
    updateTenantSettings(tenantId: string, settings: Partial<CompanySettings>): void {
        const currentSettings = this.getTenantSettings(tenantId);
        const newSettings = { ...currentSettings, ...settings };
        this.setTenantData(tenantId, 'settings', newSettings);
    },
    
    // --- Data Management (Properties, Contacts) ---
    listProperties(tenantId: string): Propiedad[] {
        return (this.getTenantData(tenantId, 'properties') as Propiedad[] | null) || [];
    },
    setProperties(tenantId: string, properties: Propiedad[]): void {
        this.setTenantData(tenantId, 'properties', properties);
    },
    
    listContacts(tenantId: string): { propietarios: Propietario[], compradores: Comprador[] } {
        return (this.getTenantData(tenantId, 'contacts') as { propietarios: Propietario[], compradores: Comprador[] } | null) || { propietarios: [], compradores: [] };
    },
    setContacts(tenantId: string, contacts: { propietarios: Propietario[], compradores: Comprador[] }): void {
        this.setTenantData(tenantId, 'contacts', contacts);
    },
};

export default adapter;