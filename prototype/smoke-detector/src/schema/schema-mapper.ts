import { MapperFunction, resolveAppearance } from '../../../dynamic-resolver';

export const schemaMapper = new Map<string, string | MapperFunction>([
    ['appearance', resolveAppearance]
]);
