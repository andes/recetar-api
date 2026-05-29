export interface IPrescriptionSupply {
    supply: {
        name?: string;
        activePrinciple?: string;
        pharmaceutical_form?: string;
        power?: string;
        unity?: string;
        firstPresentation?: string;
        secondPresentation?: string;
        snomedConcept?: { conceptId?: string; term?: string; fsn?: string; semanticTag?: string };
        code?: { source?: 'SIFAHO' | 'SNOMED'; value?: string };
        type?: 'device' | 'nutrition' | 'magistral';
        requiresSpecification?: boolean;
        specification?: string;
    };
    quantity?: number;
    quantityPresentation?: number;
    diagnostic?: string;
    indication?: string;
    duplicate?: boolean;
    triplicate?: boolean;
    triplicateData?: { serie?: string; numero?: number };
}

export interface IPrescription extends Document {
    prescriptionId?: string;
    patient: {
        firstName: string;
        lastName: string;
        dni: string;
        sex: string;
        obraSocial?: { nombre?: string; numeroAfiliado?: string };
        fechaNac?: Date;
        idMPI?: string;
    };
    professional: {
        userId?: string;
        businessName?: string;
        cuil?: string;
        enrollment?: string;
        profesionGrado?: Array<{ profesion?: string; codigoProfesion?: string; numeroMatricula?: string }>;
    };
    dispensedBy?: {
        userId?: string;
        businessName?: string;
        cuil?: string;
    };
    dispensedAt?: Date;
    supplies: IPrescriptionSupply[];
    status: 'Pendiente' | 'Dispensada' | 'Vencida';
    date: Date;
    ambito?: 'publico' | 'privado';
    trimestral?: boolean;
    organizacion?: {
        _id?: string;
        nombre?: string;
        direccion?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

