import { From } from './from';
import { Descriptive, Displayed } from './helpdoc';

export type Type<From_, To> = From<From_, To> &
  Partial<Descriptive & Displayed>;
