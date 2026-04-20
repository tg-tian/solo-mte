/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BrowserWindow } from 'electron';
import { Limiter } from '../../../base/common/async.js';
import { ILogService } from '../../log/common/log.js';
import { WebContentCache } from './webContentCache.js';
import { WebPageLoader } from './webPageLoader.js';
let NativeWebContentExtractorService = class NativeWebContentExtractorService {
    constructor(_logger) {
        this._logger = _logger;
        // Only allow 3 windows to be opened at a time
        // to avoid overwhelming the system with too many processes.
        this._limiter = new Limiter(3);
        this._webContentsCache = new WebContentCache();
    }
    extract(uris, options) {
        if (uris.length === 0) {
            this._logger.info('No URIs provided for extraction');
            return Promise.resolve([]);
        }
        this._logger.info(`Extracting content from ${uris.length} URIs`);
        return Promise.all(uris.map((uri) => this._limiter.queue(() => this.doExtract(uri, options))));
    }
    async doExtract(uri, options) {
        const cached = this._webContentsCache.tryGet(uri, options);
        if (cached !== undefined) {
            this._logger.info(`Found cached content for ${uri.toString()}`);
            return cached;
        }
        const loader = new WebPageLoader((options) => new BrowserWindow(options), this._logger, uri, options);
        try {
            const result = await loader.load();
            this._webContentsCache.add(uri, options, result);
            return result;
        }
        finally {
            loader.dispose();
        }
    }
};
NativeWebContentExtractorService = __decorate([
    __param(0, ILogService)
], NativeWebContentExtractorService);
export { NativeWebContentExtractorService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2ViQ29udGVudEV4dHJhY3Rvci9lbGVjdHJvbi1tYWluL3dlYkNvbnRlbnRFeHRyYWN0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDekMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXhELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTVDLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWdDO0lBUTVDLFlBQXlCLE9BQXFDO1FBQXBCLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFMOUQsOENBQThDO1FBQzlDLDREQUE0RDtRQUNwRCxhQUFRLEdBQUcsSUFBSSxPQUFPLENBQTBCLENBQUMsQ0FBQyxDQUFDO1FBQ25ELHNCQUFpQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFZ0IsQ0FBQztJQUVuRSxPQUFPLENBQUMsSUFBVyxFQUFFLE9BQXFDO1FBQ3pELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1lBQ3JELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsMkJBQTJCLElBQUksQ0FBQyxNQUFNLE9BQU8sQ0FBQyxDQUFDO1FBQ2pFLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRyxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFRLEVBQUUsT0FBZ0Q7UUFDekUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDM0QsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEUsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RHLElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNqRCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7Z0JBQVMsQ0FBQztZQUNWLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFuQ1ksZ0NBQWdDO0lBUS9CLFdBQUEsV0FBVyxDQUFBO0dBUlosZ0NBQWdDLENBbUM1QyJ9