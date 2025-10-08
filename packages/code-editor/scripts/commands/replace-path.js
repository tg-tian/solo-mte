export function replace(path) {
    return {
        name: 'replaceThePathOfUIVueComponent',
        renderChunk(code, chunk) {
            const fileNames = chunk.fileName.split('.');
            const format = fileNames[fileNames.length - 2];
            return code.replace(/@farris\/ui-vue\/components(\/\w+(-\w+)*)/g, (...args) => {
                return path(format, args);
            });
        }
    };
};
