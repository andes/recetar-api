import IPrescription from '../interfaces/prescription.interface';
import IUser from '../interfaces/user.interface';
import IPatient from '../interfaces/patient.interface';

export class AndesInsumoDTO {
    public static transform(prescription: IPrescription, professional: IUser, patient: IPatient, originalSupply?: any) {
        const supplyInfo = prescription.supplies[0];
        const supply = supplyInfo.supply;
        const originalSupplyId = originalSupply?.supply?._id || supply._id || supply.id || '';

        // Separar nombre y apellido del profesional
        const parts = professional.businessName ? professional.businessName.split(',') : [];
        const apellido = parts[0] ? parts[0].trim() : '';
        const nombre = parts[1] ? parts[1].trim() : '';

        const payload: any = {
            organizacion: {
                id: prescription.organizacion?._id || null,
                nombre: prescription.organizacion?.nombre || 'Recetar'
            },
            profesional: {
                id: professional.idAndes || '',
                nombre: nombre,
                apellido: apellido,
                documento: professional.username,
                profesion: professional.profesionGrado?.[0]?.profesion || '',
                matricula: professional.enrollment || '',
                especialidad: ''
            },
            fechaRegistro: prescription.date,
            fechaPrestacion: prescription.date,
            idPrestacion: prescription._id.toString(),
            idRegistro: prescription._id.toString(),
            diagnostico: supplyInfo.diagnostic || 'Sin diagnóstico',
            insumo: {
                ...(supply.snomedConcept ? {
                    concepto: {
                        conceptId: supply.snomedConcept.conceptId,
                        term: supply.snomedConcept.term
                    }
                } : {
                    generico: {
                        id: originalSupplyId.toString(),
                        nombre: supply.name || ''
                    }
                }),
                cantidad: supplyInfo.quantity || 1,
                especificacion: ((supplyInfo.indication || '') + (supply.specification ? ` - Especificación: ${supply.specification}` : '')).trim() || 'Sin especificación',
                diagnostico: supplyInfo.diagnostic || 'Sin diagnóstico'
            },
            paciente: {
                id: patient.idMPI,
                nombre: patient.firstName,
                apellido: patient.lastName,
                documento: patient.dni,
                sexo: patient.sex ? patient.sex.toLowerCase() : '',
                fechaNacimiento: patient.fechaNac,
                obraSocial: patient.obraSocial ? {
                    nombre: patient.obraSocial.nombre,
                    numeroAfiliado: patient.obraSocial.numeroAfiliado || ''
                } : undefined
            },
            origenExterno: {
                id: prescription._id.toString(),
                app: {
                    nombre: 'recetar'
                },
                fecha: prescription.date
            }
        };

        return payload;
    }
}
