import type { SizeSchema, PaddingSchema } from '@farris/flow-devkit/types';

/** 子画布默认大小 */
export const DEFAULT_SUB_FLOW_CANVAS_SIZE: Readonly<SizeSchema> = {
  width: 400,
  height: 200,
};

/** 子画布默认内边距 */
export const DEFAULT_SUB_FLOW_CANVAS_PADDING: Readonly<PaddingSchema> = {
  top: 50,
  left: 100,
  bottom: 50,
  right: 100,
};
