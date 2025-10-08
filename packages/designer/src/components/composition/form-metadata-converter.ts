/**
 * 将表单schema字段中的editor类型转为vue控件类型
 */
export class FormMetadataConverter {

    private formGroupMapper: Record<string, string> = {
        EnumField: 'combo-list',
        LookupEdit: 'input-group',
        TextBox: 'input-group',
        NumericBox: 'number-spinner',
        DateBox: 'date-picker',
        SwitchField: 'switch',
        RadioGroup: 'radio-group',
        CheckBox: 'check-box',
        Avatar: 'avatar',
        CheckGroup: 'check-group',
        MultiTextBox: 'textarea',
        RichTextBox: 'textarea',
        OrganizationSelector: 'input-group',
        PersonnelSelector: 'input-group',
        LanguageTextBox: 'language-textbox'
    };
    /** 将表单schema字段中的editor类型转为vue控件类型 */
    public getRealEditorType(type: string) {
        return this.formGroupMapper[type || 'TextBox'] || type;
    }
}
