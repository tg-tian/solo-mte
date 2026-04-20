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
import { URI } from '../../../base/common/uri.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { MainContext, ExtHostContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { Range } from '../../../editor/common/core/range.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { ILanguageStatusService } from '../../services/languageStatus/common/languageStatusService.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
let MainThreadLanguages = class MainThreadLanguages extends Disposable {
    constructor(_extHostContext, _languageService, _modelService, _resolverService, _languageStatusService) {
        super();
        this._languageService = _languageService;
        this._modelService = _modelService;
        this._resolverService = _resolverService;
        this._languageStatusService = _languageStatusService;
        this._status = this._register(new DisposableMap());
        this._proxy = _extHostContext.getProxy(ExtHostContext.ExtHostLanguages);
        this._proxy.$acceptLanguageIds(_languageService.getRegisteredLanguageIds());
        this._register(_languageService.onDidChange(_ => {
            this._proxy.$acceptLanguageIds(_languageService.getRegisteredLanguageIds());
        }));
    }
    async $changeLanguage(resource, languageId) {
        if (!this._languageService.isRegisteredLanguageId(languageId)) {
            return Promise.reject(new Error(`Unknown language id: ${languageId}`));
        }
        const uri = URI.revive(resource);
        const ref = await this._resolverService.createModelReference(uri);
        try {
            ref.object.textEditorModel.setLanguage(this._languageService.createById(languageId));
        }
        finally {
            ref.dispose();
        }
    }
    async $tokensAtPosition(resource, position) {
        const uri = URI.revive(resource);
        const model = this._modelService.getModel(uri);
        if (!model) {
            return undefined;
        }
        model.tokenization.tokenizeIfCheap(position.lineNumber);
        const tokens = model.tokenization.getLineTokens(position.lineNumber);
        const idx = tokens.findTokenIndexAtOffset(position.column - 1);
        return {
            type: tokens.getStandardTokenType(idx),
            range: new Range(position.lineNumber, 1 + tokens.getStartOffset(idx), position.lineNumber, 1 + tokens.getEndOffset(idx))
        };
    }
    // --- language status
    $setLanguageStatus(handle, status) {
        this._status.set(handle, this._languageStatusService.addStatus(status));
    }
    $removeLanguageStatus(handle) {
        this._status.deleteAndDispose(handle);
    }
};
MainThreadLanguages = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLanguages),
    __param(1, ILanguageService),
    __param(2, IModelService),
    __param(3, ITextModelService),
    __param(4, ILanguageStatusService)
], MainThreadLanguages);
export { MainThreadLanguages };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZExhbmd1YWdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQTRCLFdBQVcsRUFBRSxjQUFjLEVBQXlCLE1BQU0sK0JBQStCLENBQUM7QUFDN0gsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBRTdHLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQW1CLHNCQUFzQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDeEgsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUd2RSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFNbEQsWUFDQyxlQUFnQyxFQUNkLGdCQUFtRCxFQUN0RCxhQUE2QyxFQUN6QyxnQkFBMkMsRUFDdEMsc0JBQStEO1FBRXZGLEtBQUssRUFBRSxDQUFDO1FBTDJCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDckMsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDakMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNyQiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBUHZFLFlBQU8sR0FBRyxJ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