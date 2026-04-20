/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class TextAreaEditContextRegistryImpl {
    constructor() {
        this._textAreaEditContextMapping = new Map();
    }
    register(ownerID, textAreaEditContext) {
        this._textAreaEditContextMapping.set(ownerID, textAreaEditContext);
        return {
            dispose: () => {
                this._textAreaEditContextMapping.delete(ownerID);
            }
        };
    }
    get(ownerID) {
        return this._textAreaEditContextMapping.get(ownerID);
    }
}
export const TextAreaEditContextRegistry = new TextAreaEditContextRegistryImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFFZGl0Q29udGV4dFJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvdGV4dEFyZWEvdGV4dEFyZWFFZGl0Q29udGV4dFJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE1BQU0sK0JBQStCO0lBQXJDO1FBRVMsZ0NBQTJCLEdBQXFDLElBQUksR0FBRyxFQUFFLENBQUM7SUFjbkYsQ0FBQztJQVpBLFFBQVEsQ0FBQyxPQUFlLEVBQUUsbUJBQXdDO1FBQ2pFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDbkUsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsRCxDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFRCxHQUFHLENBQUMsT0FBZTtRQUNsQixPQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSwrQkFBK0IsRUFBRSxDQUFDIn0=