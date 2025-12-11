/** 节点的供后续节点引用的变量列表，限设计器内部使用 */
export const NODE_OUTPUT_PARAMS_KEY = '__node_output_params__';
/** 节点的供子节点引用的变量列表，限设计器内部使用 */
export const NODE_OUTPUT_PARAMS_FOR_CHILD_NODES_KEY = '__node_output_params_for_child_nodes__';
/** 节点的数据校验详情，限设计器内部使用 */
export const NODE_VALIDATION_DETAILS_KEY = '__node_validation_details__';
/** 可读的节点变量，限设计器内部使用 */
export const NODE_VARIABLES_KEY = '__node_variables__';
/** 可写的节点变量，限设计器内部使用 */
export const WRITABLE_NODE_VARIABLES_KEY = '__writable_node_variables__';

/** 变量名校验规则 */
export const VARIABLE_NAME_REGEX = /^(?!.*\b(true|false|and|AND|or|OR|not|NOT|null|nil|If|Switch)\b)[a-zA-Z_][a-zA-Z_$0-9]*$/;
