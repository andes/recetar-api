import { Document } from 'mongoose';

interface ISnomedConcept {
    conceptId?: string;
    term?: string;
    fsn?: string;
    semanticTag?: string;
}

interface ISupplyCode {
    source?: 'SIFAHO' | 'SNOMED';
    value?: string;
}

export interface ISupply extends Document {
    name: string;
    activePrinciple?: string;
    pharmaceutical_form?: string;
    power?: string;
    unity?: string;
    firstPresentation?: string;
    secondPresentation?: string;
    snomedConcept?: ISnomedConcept;
    code?: ISupplyCode;
    status?: 'active' | 'inactive';
    createdAt?: Date;
    updatedAt?: Date;
}
