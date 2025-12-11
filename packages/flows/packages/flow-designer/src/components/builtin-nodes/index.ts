import { START_NODE } from './start';
import { END_NODE } from './end';
import { SELECTOR_NODE } from './selector';
import { LOOP_NODE } from './loop';
import { VARIABLE_DEF_NODE } from './variable-def';
import { VARIABLE_ASSIGN_NODE } from './variable-assign';

export const BUILTIN_NODES = [
    START_NODE,
    END_NODE,
    SELECTOR_NODE,
    LOOP_NODE,
    VARIABLE_DEF_NODE,
    VARIABLE_ASSIGN_NODE,
];
