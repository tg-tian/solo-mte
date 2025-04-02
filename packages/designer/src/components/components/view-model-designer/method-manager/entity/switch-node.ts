import { Extension } from './extension';
import { ITreeNode } from './tree-node';
import { IOperationNode } from './operation-node';
import { Case } from './case';

export class SwitchNode implements ITreeNode, IOperationNode {
    get data(): { id: string; name: string } {
        return { id: this.id, name: this.name };
    }

    expanded?: boolean;

    get children(): ITreeNode[] {
        return this.cases || [];
    }

    id = '';;

    code = '';;

    name = '';;

    cases?: Array<Case>;

    belongedExt?: Extension;

    root?: ITreeNode;

    constructor(switchNodeJson?: any, extension?: Extension, parent?: ITreeNode) {
        if (switchNodeJson) {
            this.parse(switchNodeJson, extension);
        }
    }

    parse(switchNodeJson: any, extension?: Extension) {
        this.id = switchNodeJson.id;
        this.code = switchNodeJson.code;
        this.name = switchNodeJson.name;
        // this.cases = new SwitchCases(switchNodeJson.cases, serviceRefs);
        this.cases = switchNodeJson.cases && switchNodeJson.cases.length ?
            switchNodeJson.cases.map((caseData) => new Case(caseData, extension)) : [];

        if (extension) {
            this.belongedExt = extension;
        }
    }

    // parseFromWebCmdMetadata(branchCollection: BranchCollectionCommandItem, serviceRefs: Map<string, ServiceRef>) {
    //   this.id = branchCollection.Id;
    //   this.name = branchCollection.Name;
    //   this.cases = new Array();
    //   for (const branch of branchCollection.Items) {
    //     const casee = new Case();
    //     casee.parseFromWebCmdMetadata(branch, serviceRefs);
    //     this.cases.push(casee);
    //   }
    // }

    toJson(): any {
        const cases = this.cases && this.cases.length ? this.cases.map((casee) => casee.toJson()) : [];

        return {
            id: this.id,
            type: 'switchNode',
            code: this.code,
            name: this.name,
            cases
        };
    }
}
