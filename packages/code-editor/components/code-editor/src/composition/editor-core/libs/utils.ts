export class UtilService {

    /**
     * 生成32位Guid
     */
    static guid(prefix = ""): string {
        let timestamp = Date.now();
        return prefix + 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.substr(prefix.length).replace(/[xy]/g, function (c) {
            const random = (timestamp + Math.random() * 16) % 16 | 0;
            timestamp = Math.floor(timestamp / 16);
            return (c === 'x' ? random : (random & 3 | 8)).toString(16);
        });
    }

    /**
     * 生成随机数
     */
    static random(length = 32): string {
        let timestamp = Date.now();
        return new Array(length).fill("").map((item, index) => {
            const random = (timestamp + Math.random() * 16) % 16 | 0;
            timestamp = Math.floor(timestamp / 16);
            return (index % 2 === 1 ? random : (random & 3 | 8)).toString(16);
        }).join("");
    }

    static padLeft(value: string, length: number): string {
        value = String(value);
        if (value.length < length) {
            value = new Array(length - value.length).fill("0").join("") + value;
        }
        else if (value.length > length) {
            value = value.substr(0, length);
        }
        return value;
    }

    /**
     * 函数防抖
     */
    static debounce(Fn: (...args: any[]) => void, debounceTime = 200): (...args: any[]) => void {
        let timestamp = 0;
        let total = 0;
        return function (this: any, ...args: any[]) {
            timestamp = Date.now();
            total++;
            // 防止并发操作的时候同时被调用，用index来判断是最后一次调用的
            setTimeout((_index: number) => {
                if (total !== _index) {
                    return;
                }
                if (Date.now() < timestamp + debounceTime) {
                    return;
                }
                Fn.apply(this, [...args, total]);
                total = 0;
            }, debounceTime, total);
        };
    }

    /**
     * 节流 调用第一次
     */
    static throttle(Fn: (...args: any[]) => void, delay: number): (...args: any[]) => void {
        let timestamp = 0;
        return function (this: any, ...args: any[]) {
            const now = Date.now();
            if (now < timestamp + delay) {
                return;
            }
            Fn.apply(this, args);
            timestamp = Date.now();
        };
    }

    /**
     * 计算绝对地址
     * @param absolute 文件路径
     * @param relative 相对地址
     */
    static toAbsolute(absolute: string, relative: string) {
        // ["/user/controller.ts","../data/controller.ts"]
        if (relative[0] !== ".") {
            return relative;
        }
        // 路径结尾是带后缀的路径，且最后不是路径分割符时，认为最后一级是文件，忽略掉
        const paths = absolute.replace(/\/([^/]*\.[^/]*)?$/, "").split("/");  // .filter(item => item);
        const relatives = relative.split("/").filter(item => item);
        relatives.forEach(item => {
            if (item === ".") {
                return;
            }
            else if (item !== "..") {
                paths.push(item);
            }
            else if (paths.length) {
                paths.pop();
            }
        });
        return paths.join("/");
    }

    /**
     * 计算相对地址
     * @param source 源路径
     * @param target 目标绝对地址
     */
    static toRelative(source: string, target: string) {
        // ["/user/controller.ts","/data/controller.ts"]
        if (source[0] !== "/" || target[0] !== "/") {
            return target;
        }
        // 路径结尾是带后缀的路径，且最后不是路径分割符时，认为最后一级是文件，忽略掉
        const paths = source.split("/").filter(item => item);
        const targetPaths = target.split("/").filter(item => item);
        const index = targetPaths.findIndex((item, index) => {
            return paths[index] !== targetPaths[index];
        });
        return (paths.length > index + 1 ? "" : "./") + ([...paths.slice(index + 1).map(item => ".."), ...targetPaths.slice(index)]).join("/");
    }

}
