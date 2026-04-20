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
import { memoize } from '../../../base/common/decorators.js';
import { IProductService } from '../../product/common/productService.js';
import { AbstractSignService } from '../common/abstractSignService.js';
let SignService = class SignService extends AbstractSignService {
    constructor(productService) {
        super();
        this.productService = productService;
    }
    getValidator() {
        return this.vsda().then(vsda => {
            const v = new vsda.validator();
            return {
                createNewMessage: arg => v.createNewMessage(arg),
                validate: arg => v.validate(arg),
                dispose: () => v.free(),
            };
        });
    }
    signValue(arg) {
        return this.vsda().then(vsda => vsda.sign(arg));
    }
    async vsda() {
        return {
            validator: class {
                createNewMessage(arg) {
                    return arg;
                }
                validate() {
                    return 'ok';
                }
                free() { }
            },
            sign: (arg) => arg,
        };
    }
    async getWasmBytes() {
        return new ArrayBuffer(0);
    }
};
__decorate([
    memoize
], SignService.prototype, "vsda", null);
SignService = __decorate([
    __param(0, IProductService)
], SignService);
export { SignService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc2lnbi9icm93c2VyL3NpZ25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQXlCdkYsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDO0FBQ3BCLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQztBQUNuQixNQUFNLFNBQVMsR0FBRyxRQUFRLEdBQUcsT0FBTyxDQUFDO0FBRTlCLElBQU0sV0FBVyxHQUFqQixNQUFNLFdBQVksU0FBUSxtQkFBbUI7SUFDbkQsWUFBOEMsY0FBK0I7UUFDNUUsS0FBSyxFQUFFLENBQUM7UUFEcUMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO0lBRTdFLENBQUM7SUFDa0IsWUFBWTtRQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDL0IsT0FBTztnQkFDTixnQkFBZ0IsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUM7Z0JB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