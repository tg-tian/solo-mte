import { FModalService, F_MODAL_SERVICE_TOKEN } from "@farris/ui-vue";
import { inject } from "vue";
import FFieldsGetterDesign from "../../components/fields-getter.component";

/** 用于新增前端控制器构件 */
export function fieldGetterController() {

  const modalService: FModalService | null = inject(F_MODAL_SERVICE_TOKEN, null);

  async function getFields(title, fields, width, height) {
    let resolveFunc: (value: any) => void;
    let rejectFunc: (reason?: any) => void;
    let myModal: any = null;
    const result = new Promise<any>((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });
    function resultHandler(state, data) {
      state ? resolveFunc(data) : rejectFunc(data);
      myModal?.destroy();
    }
    myModal = modalService?.open({
      fitContent: false,
      width: width,
      height: height,
      title: title,
      showButtons: false,
      render: () => (<FFieldsGetterDesign fields={fields} onConfirm={(data) => resultHandler(true, data)} onCancel={() => resultHandler(false, {})}></FFieldsGetterDesign>)
    });
    return result;
  }

  return { getFields };
}
