export class IdService {
    private static previous = 0;

    generate() {
        return this.guid();
    }

    guid() {
         
        const _crypto = window.crypto ? crypto : window['msCrypto'];
        if (_crypto) {
            return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ (_crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
            );
        }
        return this.uuid();
    }

    uuid() {
        const timestamp = Date.now().valueOf();
        let uuid = 0;

        if (timestamp > IdService.previous) {
            IdService.previous = timestamp;
            uuid = timestamp;
        } else {
            IdService.previous += 100;
            uuid = IdService.previous;
        }

        return uuid.toString(16);
    }
}
