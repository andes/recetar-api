import { AccessControl } from 'accesscontrol';

class AccessControlLoader {

    constructor(private accessControl: AccessControl = new AccessControl()) {
        this.init();
    }

    public getAccessControl = (): AccessControl => {
        return this.accessControl;
    };

    public init = async (): Promise<void> => {
        const grantList = [
            // roles
            { role: 'owner', resource: 'role', action: 'create:any', attributes: '*, !views' },
            { role: 'owner', resource: 'role', action: 'read:any', attributes: '*' },
            { role: 'owner', resource: 'role', action: 'update:any', attributes: '*, !views' },
            { role: 'owner', resource: 'role', action: 'delete:any', attributes: '*' },

            // users
            { role: 'admin', resource: 'user', action: 'update:any', attributes: '*' },
            { role: 'admin', resource: 'user', action: 'read:any', attributes: '*' },

            { role: 'auditor', resource: 'user', action: 'read:any', attributes: '*' },
            { role: 'auditor', resource: 'user', action: 'update:any', attributes: '*' },

            { role: 'professional', resource: 'user', action: 'read:own', attributes: '*' },
            { role: 'professional', resource: 'user', action: 'update:own', attributes: '*' },

            { role: 'pharmacist', resource: 'user', action: 'read:own', attributes: '*' },
            { role: 'pharmacist', resource: 'user', action: 'update:own', attributes: '*' },

            { role: 'profesionnal-public', resource: 'user', action: 'read:own', attributes: '*' },
            { role: 'profesionnal-public', resource: 'user', action: 'update:own', attributes: '*' },
            { role: 'auditor', resource: 'user', action: 'create:any', attributes: '*' },

            // prescriptions
            { role: 'professional', resource: 'prescription', action: 'create:any', attributes: '*, !views' },
            { role: 'professional', resource: 'prescription', action: 'read:own', attributes: '*' },
            { role: 'professional', resource: 'prescription', action: 'read:any', attributes: '*' },
            { role: 'professional', resource: 'prescription', action: 'update:own', attributes: '*' },
            { role: 'professional', resource: 'prescription', action: 'delete:any', attributes: '*' },

            { role: 'pharmacist', resource: 'prescription', action: 'read:any', attributes: '*' },
            { role: 'pharmacist', resource: 'prescription', action: 'update:any', attributes: '*, !views' },

            { role: 'owner', resource: 'prescription', action: 'delete:any', attributes: '*' },

            { role: 'auditor', resource: 'prescription', action: 'read:any', attributes: '*' },

            // prescriptions public
            { role: 'professional-public', resource: 'prescriptionPublic', action: 'create:any', attributes: '*, !views' },
            { role: 'professional-public', resource: 'prescriptionPublic', action: 'read:own', attributes: '*' },
            { role: 'professional-public', resource: 'prescriptionPublic', action: 'read:any', attributes: '*' },
            { role: 'professional-public', resource: 'prescriptionPublic', action: 'update:own', attributes: '*' },
            { role: 'professional-public', resource: 'prescriptionPublic', action: 'delete:any', attributes: '*' },

            { role: 'pharmacist-public', resource: 'prescriptionPublic', action: 'read:any', attributes: '*' },
            { role: 'pharmacist-public', resource: 'prescriptionPublic', action: 'update:any', attributes: '*' },

            { role: 'owner', resource: 'prescriptionPublic', action: 'delete:any', attributes: '*' },

            { role: 'auditor', resource: 'prescriptionPublic', action: 'read:any', attributes: '*' },

            // patients
            { role: 'professional', resource: 'patient', action: 'create:any', attributes: '*, !views' },
            { role: 'professional', resource: 'patient', action: 'read:own', attributes: '*' },
            { role: 'pharmacist', resource: 'patient', action: 'read:any', attributes: '*' },
            { role: 'admin', resource: 'patient', action: 'update:any', attributes: '*' },

            { role: 'owner', resource: 'patient', action: 'delete:any', attributes: '*' },

            // supplies
            { role: 'professional', resource: 'supplies', action: 'read:any', attributes: '*' },
            { role: 'pharmacist', resource: 'supplies', action: 'read:any', attributes: '*' },
            { role: 'admin', resource: 'supplies', action: 'create:any', attributes: '*' },
            { role: 'admin', resource: 'supplies', action: 'update:any', attributes: '*' },
            { role: 'andes', resource: 'andesPrescription', action: 'create:any', attributes: '*' }
        ];
        this.accessControl.setGrants(grantList);
        // eslint-disable-next-line no-console
        console.log('grants initialized');
    };


    public asyncForEach = async (array: any[], callback: Function) => {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    };

}

const accessControlLoader = new AccessControlLoader();
const accessControl = accessControlLoader.getAccessControl();
export default accessControl;

