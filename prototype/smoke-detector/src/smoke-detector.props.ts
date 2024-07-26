/* eslint-disable max-len */
import { ExtractPropTypes, PropType } from 'vue';
import { createPropsResolver } from '../../dynamic-resolver';
import { schemaMapper } from './schema/schema-mapper';
import { schemaResolver } from './schema/schema-resolver';
import smokeDetectorSchema from './schema/smoke-detector.schema.json';
import propertyConfig from './property-config/smoke-detector.property-config.json';

export const smokeDetectorProps = {

} as Record<string, any>;

export type SmokeDetectorProps = ExtractPropTypes<typeof smokeDetectorProps>;

export const propsResolver = createPropsResolver<SmokeDetectorProps>(smokeDetectorProps, smokeDetectorSchema, schemaMapper, schemaResolver, propertyConfig);
