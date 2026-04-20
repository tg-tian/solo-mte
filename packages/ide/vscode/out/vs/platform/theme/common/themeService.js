/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../base/common/codicons.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import * as platform from '../../registry/common/platform.js';
import { ColorScheme, ThemeTypeSelector } from './theme.js';
export const IThemeService = createDecorator('themeService');
export function themeColorFromId(id) {
    return { id };
}
export const FileThemeIcon = Codicon.file;
export const FolderThemeIcon = Codicon.folder;
export function getThemeTypeSelector(type) {
    switch (type) {
        case ColorScheme.DARK: return ThemeTypeSelector.VS_DARK;
        case ColorScheme.HIGH_CONTRAST_DARK: return ThemeTypeSelector.HC_BLACK;
        case ColorScheme.HIGH_CONTRAST_LIGHT: return ThemeTypeSelector.HC_LIGHT;
        default: return ThemeTypeSelector.VS;
    }
}
export class IFontTokenOptions {
}
// static theming participant
export const Extensions = {
    ThemingContribution: 'base.contributions.theming'
};
class ThemingRegistry extends Disposable {
    constructor() {
        super();
        this.themingParticipants = [];
        this.themingParticipants = [];
        this.onThemingParticipantAddedEmitter = this._register(new Emitter());
    }
    onColorThemeChange(participant) {
        this.themingParticipants.push(participant);
        this.onThemingParticipantAddedEmitter.fire(participant);
        return toDisposable(() => {
            const idx = this.themingParticipants.indexOf(participant);
            this.themingParticipants.splice(idx, 1);
        });
    }
    get onThemingParticipantAdded() {
        return this.onThemingParticipantAddedEmitter.event;
    }
    getThemingParticipants() {
        return this.themingParticipants;
    }
}
const themingRegistry = new ThemingRegistry();
platform.Registry.add(Extensions.ThemingContribution, themingRegistry);
export function registerThemingParticipant(participant) {
    return themingRegistry.onColorThemeChange(participant);
}
/**
 * Utility base class for all themable components.
 */
export class Themable extends Disposable {
    constructor(themeService) {
        super();
        this.themeService = themeService;
        this.theme = themeService.getColorTheme();
        // Hook up to theme changes
        this._register(this.themeService.onDidColorThemeChange(theme => this.onThemeChange(theme)));
    }
    onThemeChange(theme) {
        this.theme = theme;
        this.updateStyles();
    }
    updateStyles() {
        // Subclasses to override
    }
    getColor(id, modify) {
        let color = this.theme.getColor(id);
        if (color && modify) {
            color = modify(color, this.theme);
        }
        return color ? color.toString() : null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2NvbW1vbi90aGVtZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEtBQUssUUFBUSxNQUFNLG1DQUFtQyxDQUFDO0FBRzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFNUQsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBZ0IsY0FBYyxDQUFDLENBQUM7QUFFNUUsTUFBTSxVQUFVLGdCQUFnQixDQUFDLEVBQW1CO0lBQ25ELE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQyxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUU5QyxNQUFNLFVBQVUsb0JBQW9CLENBQUMsSUFBaUI7SUFDckQsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUNkLEtBQUssV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8saUJBQWlCLENBQUMsT0FBTyxDQUFDO1FBQ3hELEtBQUssV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7UUFDdkUsS0FBSyxXQUFXLENBQUMsbUJB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