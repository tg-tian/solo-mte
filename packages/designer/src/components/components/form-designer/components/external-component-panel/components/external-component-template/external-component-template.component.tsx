import { ref } from "vue";

export default function () {
    const templates = ref([
        {
            code: 'Independence',
            name: '弹窗',
            imagePath: './assets/images/independence-component.svg',

        }, {
            code: 'Lookup',
            name: '帮助',
            imagePath: './assets/images/lookup-component.svg',
        },
    ]);

    function renderTemplate(template: { code: string, name: string, imagePath: string }) {
        const { code, name, imagePath } = template;
        return (
            <div class="f-external-component-template-box-container">
                <div data-code={code}
                    data-name={name}>
                    <div class="f-external-component-template-img-container" >
                        <img width="138px" height="109px" src={imagePath}></img>
                    </div>
                    <div class="f-external-component-template-text-container">
                        <div style="margin: auto;">{name}</div>
                    </div>
                </div>
            </div>
        );
    }

    return () => {
        return (
            <div class="f-external-component-template-container" >
                <div class="f-external-component-panel-usual-template-text">常用模板</div>
                <div class="card-body px-2 py-0 border-0 controlCategory no-drop">
                    {templates.value.map(renderTemplate)}
                </div>
            </div>
        )
    }
}
