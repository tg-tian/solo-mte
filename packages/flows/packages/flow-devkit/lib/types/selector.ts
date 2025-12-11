import type { LogicExpr } from './value-express';

export interface SelectorBranch {
    /**
     * 比较表达式
     * @description 作为分支列表中的最后一个分支时（代表ELSE分支），本字段允许为空
     */
    conditionExpr?: LogicExpr;
    /** 连接点ID */
    port: string;
}
