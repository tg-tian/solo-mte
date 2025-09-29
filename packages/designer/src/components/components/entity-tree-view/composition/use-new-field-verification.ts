import axios from "axios";
import { ref, Ref } from "vue";
import { CreateNewFieldProps } from "../components/entity-tree-view.props";
import { ElementDataType, ElementObjectType, ExtendFieldEntity } from "./extend-field";

export function useNewFieldVerification(props: CreateNewFieldProps, extendField: Ref<ExtendFieldEntity>, notifyService: any) {

    /** 字段名称是否已存在 */
    const isFieldNameExisted = ref(false);
    /** 字段标签是否有效 */
    const isFieldLabelValid = ref(true);
    /** 字段标签提示信息 */
    const fieldLabelMessage = ref('存储标签：');


    /**
     * 校验名称是否重复
     */
    function checkFieldNameExisted() {
        const names = props.existedAllFields.map(field => field.name);
        isFieldNameExisted.value = names.includes(extendField.value.name);
    }

    /**
     * 校验字段编号：前端
     */
    function checkFieldCodeRegValid() {
        if (!extendField.value.code) {
            isFieldLabelValid.value = true;
            fieldLabelMessage.value = '存储标签：';
            extendField.value.label = '';
            return true;
        }
        // 1、校验特殊字符
        const reg = /^[a-zA-Z][a-zA-Z0-9]*$/;
        if (!reg.test(extendField.value.code)) {
            isFieldLabelValid.value = false;
            fieldLabelMessage.value = '只允许输入数字、英文字母，且首字母只能为英文字母。';
            extendField.value.label = '';

            return false;
        }

        // 2、校验code是否重复
        const codes = props.existedAllFields.map(field => {
            let lowerCode = field.code.toLowerCase();
            if (lowerCode.includes('ext_') && lowerCode.includes('_lv9')) {
                lowerCode = lowerCode.replace('ext_', '').replace('_lv9', '');
            }
            return lowerCode;
        });
        if (codes.includes(extendField.value.code.toLowerCase())) {
            isFieldLabelValid.value = false;
            let msg = '编号XXX已存在，请重新输入。';
            msg = msg.replace('XXX', extendField.value.code);
            fieldLabelMessage.value = msg;
            extendField.value.label = '';

            return false;
        }
        isFieldLabelValid.value = true;
        fieldLabelMessage.value = '存储标签：';
        return true;
    }

    /**
     * 校验字段编号：后端
     */
    function checkFieldCodeValid(): Promise<boolean> {

        if (!extendField.value.code) {
            return Promise.resolve(true);
        }
        if (!checkFieldCodeRegValid()) {
            return Promise.resolve(true);
        }

        // 3、后台校验：若所属实体为新创建的表，则不进行后台校验
        if (props.isNewEntity) {
            isFieldLabelValid.value = true;

            // label拼接前后缀
            extendField.value.label = 'ext_' + extendField.value.code + '_Lv9';
            const labelMsg = '存储标签：';
            fieldLabelMessage.value = labelMsg + extendField.value.label;

            return Promise.resolve(true);
        }

        const checkLabelValidURL = '/api/runtime/bcc/v1.0/template/newFieldLabel';
        const voId = props.useFormSchema.getSchemas().id;

        return new Promise((resolve, reject) => {
            axios.get(`${checkLabelValidURL}/${voId}/${props.entityCode}/${extendField.value.code}`).then((result: any) => {
                const data = result?.data;
                if (!data) {
                    resolve(false);
                    return;
                }
                if (data.valid) {

                    isFieldLabelValid.value = true;
                    const labelMsg = '存储标签：';
                    fieldLabelMessage.value = labelMsg + data.label;
                    extendField.value.label = data.label;
                    resolve(true);
                    return;
                } else {
                    isFieldLabelValid.value = false;
                    fieldLabelMessage.value = data.msg;
                    extendField.value.label = '';
                    resolve(false);
                    return;

                }
            }, () => {
                isFieldLabelValid.value = false;
                fieldLabelMessage.value = '校验字段编号失败。';
                resolve(false);
                return;
            });

        });

    }

    function checkDefaultValueValid(defaultValueRef: Ref<any>) {
        if (defaultValueRef.value?.currentPropertyType === 'Expression' && !extendField.value.defaultValue?.value) {
            notifyService.warning('请填写默认值表达式');
            return false;
        }
        return true;
    }
    function checkFieldValidation(helpMetadataName: Ref<any>, relatedHelpFieldIds: Ref<any>, helpFieldId: Ref<any>, defaultValueRef: Ref<any>) {
        if (!isFieldLabelValid.value) {
            return false;
        }
        if (!extendField.value.type) {
            notifyService.warning('字段类型不能为空');
            return false;
        }
        if (!extendField.value.name) {
            notifyService.warning('字段名称不能为空');
            return false;
        }
        if (!extendField.value.code) {
            notifyService.warning('字段编号不能为空');
            return false;
        }
        if (!extendField.value.objectType) {
            notifyService.warning('对象类型不能为空');
            return false;
        }
        if (extendField.value.length === null) {
            notifyService.warning('字段长度不能为空');
            return false;
        }
        if (extendField.value.precision === null) {
            notifyService.warning('字段精度不能为空');
            return false;
        }
        if (!checkDefaultValueValid(defaultValueRef)) {
            return false;
        }

        if (extendField.value.type === ElementDataType.String && extendField.value.objectType === ElementObjectType.Association) {
            if (!helpMetadataName.value) {
                notifyService.warning('请选择帮助！');
                return false;
            }
            if (!relatedHelpFieldIds.value?.length) {
                notifyService.warning('请选择关联字段！');
                return false;
            }
            if (!helpFieldId.value) {
                notifyService.warning('请选择帮助绑定字段！');
                return false;
            }
        }

        if (extendField.value.objectType === ElementObjectType.Enum &&
            (!extendField.value.enumValues || !extendField.value.enumValues.length)) {
            notifyService.warning('请填写枚举数据！');
            return false;
        }
        return true;
    }
    return {
        isFieldNameExisted,
        checkFieldNameExisted,
        checkFieldCodeRegValid,
        checkFieldCodeValid,
        fieldLabelMessage,
        isFieldLabelValid,
        checkFieldValidation
    };
}
