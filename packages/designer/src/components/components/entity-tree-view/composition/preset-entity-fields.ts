import { IdService } from "../../view-model-designer/method-manager/service/id.service";

export function resolvePresetFields() {
    const idService = new IdService();
    const idID = idService.generate();
    const parentIDID = idService.generate();

    return [{
        $type: 'SimpleField',
        id: idID,
        originalId: idID,
        code: 'ID',
        name: 'ID',
        label: 'id',
        bindingField: 'id',
        defaultValue: '',
        require: true,
        readonly: false,
        type: {
            $type: 'StringType',
            name: 'String',
            displayName: '字符串',
            length: 36
        },
        editor: {
            $type: 'TextBox'
        },
        path: 'ID',
        bindingPath: 'id',
        multiLanguage: false
    },
    {
        $type: 'SimpleField',
        id: parentIDID,
        originalId: parentIDID,
        code: 'ParentID',
        name: 'ParentID',
        label: 'parentID',
        bindingField: 'parentID',
        defaultValue: '',
        require: true,
        readonly: false,
        type: {
            $type: 'StringType',
            name: 'String',
            displayName: '字符串',
            length: 36
        },
        editor: {
            $type: 'TextBox'
        },
        path: 'ParentID',
        bindingPath: 'parentID',
        multiLanguage: false
    }];
}
