import { Document } from 'mongoose';

export interface ISnomedConcept {
  conceptId: string,
  term: string,
  fsn: string,
  semanticTag: string
}

export default interface ISupply extends Document {
  id: string;
  name: string;
  activePrinciple: string;
  power: string;
  unity: string;
  firstPresentation: string;
  secondPresentation: string;
  pharmaceutical_form: string;
  snomedConcept: ISnomedConcept;
}