import { AccessControl } from 'accesscontrol';

const anyDocumentRoles = ['professional', 'professional-public'];
const readDocumentRoles = ['pharmacist', 'pharmacist-public'];

const grants: Array<{ role: string; resource: string; action: string; attributes: string }> = [
    // roles
    { role: 'owner', resource: 'role', action: 'create:any', attributes: '*, !views' },
    { role: 'owner', resource: 'role', action: 'read:any', attributes: '*' },
    { role: 'owner', resource: 'role', action: 'update:any', attributes: '*, !views' },
    { role: 'owner', resource: 'role', action: 'delete:any', attributes: '*' },

    // users
    { role: 'admin', resource: 'user', action: 'create:any', attributes: '*' },
    { role: 'admin', resource: 'user', action: 'read:any', attributes: '*' },
    { role: 'admin', resource: 'user', action: 'update:any', attributes: '*' },
    { role: 'admin', resource: 'user', action: 'delete:any', attributes: '*' },

    { role: 'owner', resource: 'user', action: 'delete:any', attributes: '*' },

    { role: 'auditor', resource: 'user', action: 'create:any', attributes: '*' },
    { role: 'auditor', resource: 'user', action: 'read:any', attributes: '*' },
    { role: 'auditor', resource: 'user', action: 'update:any', attributes: '*' },

    { role: 'professional', resource: 'user', action: 'read:own', attributes: '*' },
    { role: 'professional', resource: 'user', action: 'update:own', attributes: '*' },
    { role: 'professional-public', resource: 'user', action: 'read:own', attributes: '*' },
    { role: 'professional-public', resource: 'user', action: 'update:own', attributes: '*' },
    { role: 'pharmacist', resource: 'user', action: 'read:own', attributes: '*' },
    { role: 'pharmacist', resource: 'user', action: 'update:own', attributes: '*' },
    { role: 'pharmacist-public', resource: 'user', action: 'read:own', attributes: '*' },
    { role: 'pharmacist-public', resource: 'user', action: 'update:own', attributes: '*' },

    // stock
    { role: 'professional', resource: 'stock', action: 'read:any', attributes: '*' },
    { role: 'professional-public', resource: 'stock', action: 'read:any', attributes: '*' },
    { role: 'pharmacist', resource: 'stock', action: 'read:any', attributes: '*' },
    { role: 'pharmacist-public', resource: 'stock', action: 'read:any', attributes: '*' },
    { role: 'auditor', resource: 'stock', action: 'read:any', attributes: '*' },
    { role: 'admin', resource: 'stock', action: 'read:any', attributes: '*' },
];

const documentResources = ['prescription', 'prescriptionPublic', 'practice', 'certificate'];

for (const resource of documentResources) {
    for (const role of anyDocumentRoles) {
        grants.push({ role, resource, action: 'create:any', attributes: '*, !views' });
        grants.push({ role, resource, action: 'read:any', attributes: '*' });
        grants.push({ role, resource, action: 'read:own', attributes: '*' });
        grants.push({ role, resource, action: 'update:own', attributes: '*' });
        grants.push({ role, resource, action: 'delete:any', attributes: '*' });
    }
    for (const role of readDocumentRoles) {
        grants.push({ role, resource, action: 'read:any', attributes: '*' });
        grants.push({ role, resource, action: 'update:any', attributes: '*, !views' });
    }
    grants.push({ role: 'admin', resource, action: 'create:any', attributes: '*, !views' });
    grants.push({ role: 'admin', resource, action: 'read:any', attributes: '*' });
    grants.push({ role: 'admin', resource, action: 'update:any', attributes: '*, !views' });
    grants.push({ role: 'admin', resource, action: 'delete:any', attributes: '*' });
    grants.push({ role: 'auditor', resource, action: 'read:any', attributes: '*' });
    grants.push({ role: 'owner', resource, action: 'read:any', attributes: '*' });
    grants.push({ role: 'owner', resource, action: 'delete:any', attributes: '*' });
}

// patients
grants.push({ role: 'professional', resource: 'patient', action: 'create:any', attributes: '*, !views' });
grants.push({ role: 'professional', resource: 'patient', action: 'read:any', attributes: '*' });
grants.push({ role: 'professional', resource: 'patient', action: 'read:own', attributes: '*' });
grants.push({ role: 'professional', resource: 'patient', action: 'update:any', attributes: '*' });
grants.push({ role: 'professional', resource: 'patient', action: 'delete:any', attributes: '*' });
grants.push({ role: 'professional-public', resource: 'patient', action: 'create:any', attributes: '*' });
grants.push({ role: 'professional-public', resource: 'patient', action: 'read:any', attributes: '*' });
grants.push({ role: 'professional-public', resource: 'patient', action: 'update:any', attributes: '*' });
grants.push({ role: 'professional-public', resource: 'patient', action: 'delete:any', attributes: '*' });
grants.push({ role: 'pharmacist', resource: 'patient', action: 'read:any', attributes: '*' });
grants.push({ role: 'pharmacist-public', resource: 'patient', action: 'read:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'patient', action: 'create:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'patient', action: 'read:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'patient', action: 'update:any', attributes: '*' });
grants.push({ role: 'auditor', resource: 'patient', action: 'read:any', attributes: '*' });
grants.push({ role: 'auditor', resource: 'patient', action: 'update:any', attributes: '*' });
grants.push({ role: 'auditor', resource: 'patient', action: 'delete:any', attributes: '*' });
grants.push({ role: 'owner', resource: 'patient', action: 'read:any', attributes: '*' });
grants.push({ role: 'owner', resource: 'patient', action: 'delete:any', attributes: '*' });

// supplies
grants.push({ role: 'professional', resource: 'supplies', action: 'read:any', attributes: '*' });
grants.push({ role: 'professional-public', resource: 'supplies', action: 'read:any', attributes: '*' });
grants.push({ role: 'pharmacist', resource: 'supplies', action: 'read:any', attributes: '*' });
grants.push({ role: 'pharmacist-public', resource: 'supplies', action: 'read:any', attributes: '*' });
grants.push({ role: 'auditor', resource: 'supplies', action: 'read:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'supplies', action: 'read:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'supplies', action: 'create:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'supplies', action: 'update:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'supplies', action: 'delete:any', attributes: '*' });
grants.push({ role: 'owner', resource: 'supplies', action: 'read:any', attributes: '*' });
grants.push({ role: 'owner', resource: 'supplies', action: 'delete:any', attributes: '*' });

// documents (dashboard)
grants.push({ role: 'professional', resource: 'document', action: 'read:any', attributes: '*' });
grants.push({ role: 'professional-public', resource: 'document', action: 'read:any', attributes: '*' });
grants.push({ role: 'pharmacist', resource: 'document', action: 'read:any', attributes: '*' });
grants.push({ role: 'pharmacist-public', resource: 'document', action: 'read:any', attributes: '*' });
grants.push({ role: 'auditor', resource: 'document', action: 'read:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'document', action: 'read:any', attributes: '*' });
grants.push({ role: 'owner', resource: 'document', action: 'read:any', attributes: '*' });

// applications (alta y emision de tokens de aplicacion)
grants.push({ role: 'admin', resource: 'application', action: 'create:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'application', action: 'read:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'application', action: 'update:any', attributes: '*' });
grants.push({ role: 'admin', resource: 'application', action: 'delete:any', attributes: '*' });
grants.push({ role: 'owner', resource: 'application', action: 'create:any', attributes: '*' });
grants.push({ role: 'owner', resource: 'application', action: 'read:any', attributes: '*' });
grants.push({ role: 'owner', resource: 'application', action: 'update:any', attributes: '*' });
grants.push({ role: 'owner', resource: 'application', action: 'delete:any', attributes: '*' });

// andes system
grants.push({ role: 'andes', resource: 'andesPrescription', action: 'create:any', attributes: '*' });

const accessControl = new AccessControl();
accessControl.setGrants(grants);

export default accessControl;
