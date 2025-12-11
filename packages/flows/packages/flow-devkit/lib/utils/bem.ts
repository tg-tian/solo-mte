export const useBem = (name: string) => {

    const snakeCaseName = camelToKebabCase(name);

    /**
     * @param element 元素类名
     * @returns .block__element
     */
    const getElementClass = (element?: string | string[]) => {
        if (!element) {
            return snakeCaseName;
        }
        const elementClass = Array.isArray(element) ? element.join('__') : element;
        return `${snakeCaseName}__${elementClass}`;
    };

    /**
     * @param modifier 修饰符
     * @param element 元素类名
     * @returns .block[__element]--modifier
     */
    const getModifierClass = (modifier: string, element?: string | string[]) => {
        const modifierClass = modifier ? `--${modifier}` : '';
        if (element) {
            return getElementClass(element) + modifierClass;
        }
        return snakeCaseName + modifierClass;
    };

    /**
     * @param element 元素类名
     * @param modifier 修饰符
     * @returns .block__element--modifier
     */
    const bem = (element?: string | string[], modifier?: string) => {
        return modifier ? getModifierClass(modifier, element) : getElementClass(element);
    };

    return {
        bem,
        getElementClass,
        getModifierClass
    };
};

function camelToKebabCase(camelStr: string) {
    return camelStr.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
