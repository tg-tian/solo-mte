/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { CancellationToken } from '../../../../../../../base/common/cancellation.js';
import { ResourceSet } from '../../../../../../../base/common/map.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../../editor/common/services/model.js';
import { ModelService } from '../../../../../../../editor/common/services/modelService.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILabelService } from '../../../../../../../platform/label/common/label.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../../../platform/workspace/common/workspace.js';
import { testWorkspace } from '../../../../../../../platform/workspace/test/common/testWorkspace.js';
import { IWorkbenchEnvironmentService } from '../../../../../../services/environment/common/environmentService.js';
import { IFilesConfigurationService } from '../../../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IUserDataProfileService } from '../../../../../../services/userDataProfile/common/userDataProfile.js';
import { TestContextService, TestUserDataProfileService } from '../../../../../../test/common/workbenchTestServices.js';
import { ChatRequestVariableSet, isPromptFileVariableEntry, toFileVariableEntry } from '../../../../common/chatVariableEntries.js';
import { ComputeAutomaticInstructions, newInstructionsCollectionEvent } from '../../../../common/promptSyntax/computeAutomaticInstructions.js';
import { PromptsConfig } from '../../../../common/promptSyntax/config/config.js';
import { INSTRUCTION_FILE_EXTENSION, INSTRUCTIONS_DEFAULT_SOURCE_FOLDER, LEGACY_MODE_DEFAULT_SOURCE_FOLDER, PROMPT_DEFAULT_SOURCE_FOLDER, PROMPT_FILE_EXTENSION } from '../../../../common/promptSyntax/config/promptFileLocations.js';
import { INSTRUCTIONS_LANGUAGE_ID, PROMPT_LANGUAGE_ID, PromptsType } from '../../../../common/promptSyntax/promptTypes.js';
import { ExtensionAgentSourceType, IPromptsService, PromptsStorage } from '../../../../common/promptSyntax/service/promptsService.js';
import { PromptsService } from '../../../../common/promptSyntax/service/promptsServiceImpl.js';
import { mockFiles } from '../testUtils/mockFilesystem.js';
import { InMemoryStorageService, IStorageService } from '../../../../../../../platform/storage/common/storage.js';
import { IPathService } from '../../../../../../services/path/common/pathService.js';
import { ISearchService } from '../../../../../../services/search/common/search.js';
import { IExtensionService } from '../../../../../../services/extensions/common/extensions.js';
import { IDefaultAccountService } from '../../../../../../../platform/defaultAccount/common/defaultAccount.js';
suite('PromptsService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    let instaService;
    let workspaceContextService;
    let testConfigService;
    let fileService;
    setup(async () => {
        instaService = disposables.add(new TestInstantiationService());
        instaService.stub(ILogService, new NullLogService());
        workspaceContextService = new TestContextService();
        instaService.stub(IWorkspaceContextService, workspaceContextService);
        testConfigService = new TestConfigurationService();
        testConfigService.setUserConfiguration(PromptsConfig.USE_COPILOT_INSTRUCTION_FILES, true);
        testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_MD, true);
        testConfigService.setUserConfiguration(PromptsConfig.USE_NESTED_AGENT_MD, false);
        testConfigService.setUserConfiguration(PromptsConfig.INSTRUCTIONS_LOCATION_KEY, { [INSTRUCTIONS_DEFAULT_SOURCE_FOLDER]: true });
        testConfigService.setUserConfiguration(PromptsConfig.PROMPT_LOCATIONS_KEY, { [PROMPT_DEFAULT_SOURCE_FOLDER]: true });
        testConfigService.setUserConfiguration(PromptsConfig.MODE_LOCATION_KEY, { [LEGACY_MODE_DEFAULT_SOURCE_FOLDER]: true });
        instaService.stub(IConfigurationService, testConfigService);
        instaService.stub(IWorkbenchEnvironmentService, {});
        instaService.stub(IUserDataProfileService, new TestUserDataProfileService());
        instaService.stub(ITelemetryService, NullTelemetryService);
        instaService.stub(IStorageService, InMemoryStorageService);
        instaService.stub(IExtensionService, {
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
            activateByEvent: () => Promise.resolve()
        });
        instaService.stub(IDefaultAccountService, {
            getDefaultAccount: () => Promise.resolve({ chat_preview_features_enabled: true })
        });
        fileService = disposables.add(instaService.createInstance(FileService));
        instaService.stub(IFileService, fileService);
        const modelService = disposables.add(instaService.createInstance(ModelService));
        instaService.stub(IModelService, modelService);
        instaService.stub(ILanguageService, {
            guessLanguageIdByFilepathOrFirstLine(uri) {
                if (uri.path.endsWith(PROMPT_FILE_EXTENSION)) {
                    return PROMPT_LANGUAGE_ID;
                }
                if (uri.path.endsWith(INSTRUCTION_FILE_EXTENSION)) {
                    return INSTRUCTIONS_LANGUAGE_ID;
                }
                return 'plaintext';
            }
        });
        instaService.stub(ILabelService, { getUriLabel: (uri) => uri.path });
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        instaService.stub(IFilesConfigurationService, { updateReadonly: () => Promise.resolve() });
        const pathService = {
            userHome: () => {
                return Promise.resolve(URI.file('/home/user'));
            },
        };
        instaService.stub(IPathService, pathService);
        instaService.stub(ISearchService, {});
        service = disposables.add(instaService.createInstance(PromptsService));
        instaService.stub(IPromptsService, service);
    });
    suite('parse', () => {
        test('explicit', async function () {
            const rootFolderName = 'resolves-nested-file-references';
            const rootFolder = `/${rootFolderName}`;
            const rootFileName = 'file2.prompt.md';
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            const rootFileUri = URI.joinPath(rootFolderUri, rootFileName);
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/file1.prompt.md`,
                    contents: [
                        '## Some Header',
                        'some contents',
                        ' ',
                    ],
                },
                {
                    path: `${rootFolder}/${rootFileName}`,
                    contents: [
                        '---',
                        'description: \'Root prompt description.\'',
                        'tools: [\'my-tool1\', , true]',
                        'agent: "agent" ',
                        '---',
                        '## Files',
                        '\t- this file #file:folder1/file3.prompt.md ',
                        '\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!',
                        '## Vars',
                        '\t- #tool:my-tool',
                        '\t- #tool:my-other-tool',
                        ' ',
                    ],
                },
                {
                    path: `${rootFolder}/folder1/file3.prompt.md`,
                    contents: [
                        '---',
                        'tools: [ false, \'my-tool1\' , ]',
                        'agent: \'edit\'',
                        '---',
                        '',
                        '[](./some-other-folder/non-existing-folder)',
                        `\t- some seemingly random #file:${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.instructions.md contents`,
                        ' some more\t content',
                    ],
                },
                {
                    path: `${rootFolder}/folder1/some-other-folder/file4.prompt.md`,
                    contents: [
                        '---',
                        'tools: [\'my-tool1\', "my-tool2", true, , ]',
                        'something: true',
                        'agent: \'ask\'\t',
                        'description: "File 4 splendid description."',
                        '---',
                        'this file has a non-existing #file:./some-non-existing/file.prompt.md\t\treference',
                        '',
                        '',
                        'and some',
                        ' non-prompt #file:./some-non-prompt-file.md\t\t \t[](../../folder1/)\t',
                    ],
                },
                {
                    path: `${rootFolder}/folder1/some-other-folder/file.txt`,
                    contents: [
                        '---',
                        'description: "Non-prompt file description".',
                        'tools: ["my-tool-24"]',
                        '---',
                    ],
                },
                {
                    path: `${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.instructions.md`,
                    contents: [
                        '---',
                        'description: "Another file description."',
                        'tools: [\'my-tool3\', false, "my-tool2" ]',
                        'applyTo: "**/*.tsx"',
                        '---',
                        `[](${rootFolder}/folder1/some-other-folder)`,
                        'another-file.instructions.md contents\t [#file:file.txt](../file.txt)',
                    ],
                },
                {
                    path: `${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/one_more_file_just_in_case.prompt.md`,
                    contents: ['one_more_file_just_in_case.prompt.md contents'],
                },
            ]);
            const file3 = URI.joinPath(rootFolderUri, 'folder1/file3.prompt.md');
            const file4 = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/file4.prompt.md');
            const someOtherFolder = URI.joinPath(rootFolderUri, '/folder1/some-other-folder');
            const someOtherFolderFile = URI.joinPath(rootFolderUri, '/folder1/some-other-folder/file.txt');
            const nonExistingFolder = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/non-existing-folder');
            const yetAnotherFile = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/yetAnotherFolder🤭/another-file.instructions.md');
            const result1 = await service.parseNew(rootFileUri, CancellationToken.None);
            assert.deepEqual(result1.uri, rootFileUri);
            assert.deepEqual(result1.header?.description, 'Root prompt description.');
            assert.deepEqual(result1.header?.tools, ['my-tool1']);
            assert.deepEqual(result1.header?.agent, 'agent');
            assert.ok(result1.body);
            assert.deepEqual(result1.body.fileReferences.map(r => result1.body?.resolveFilePath(r.content)), [file3, file4]);
            assert.deepEqual(result1.body.variableReferences, [
                { name: 'my-tool', range: new Range(10, 10, 10, 17), offset: 240 },
                { name: 'my-other-tool', range: new Range(11, 10, 11, 23), offset: 257 },
            ]);
            const result2 = await service.parseNew(file3, CancellationToken.None);
            assert.deepEqual(result2.uri, file3);
            assert.deepEqual(result2.header?.agent, 'edit');
            assert.ok(result2.body);
            assert.deepEqual(result2.body.fileReferences.map(r => result2.body?.resolveFilePath(r.content)), [nonExistingFolder, yetAnotherFile]);
            const result3 = await service.parseNew(yetAnotherFile, CancellationToken.None);
            assert.deepEqual(result3.uri, yetAnotherFile);
            assert.deepEqual(result3.header?.description, 'Another file description.');
            assert.deepEqual(result3.header?.applyTo, '**/*.tsx');
            assert.ok(result3.body);
            assert.deepEqual(result3.body.fileReferences.map(r => result3.body?.resolveFilePath(r.content)), [someOtherFolder, someOtherFolderFile]);
            assert.deepEqual(result3.body.variableReferences, []);
            const result4 = await service.parseNew(file4, CancellationToken.None);
            assert.deepEqual(result4.uri, file4);
            assert.deepEqual(result4.header?.description, 'File 4 splendid description.');
            assert.ok(result4.body);
            assert.deepEqual(result4.body.fileReferences.map(r => result4.body?.resolveFilePath(r.content)), [
                URI.joinPath(rootFolderUri, '/folder1/some-other-folder/some-non-existing/file.prompt.md'),
                URI.joinPath(rootFolderUri, '/folder1/some-other-folder/some-non-prompt-file.md'),
                URI.joinPath(rootFolderUri, '/folder1/'),
            ]);
            assert.deepEqual(result4.body.variableReferences, []);
        });
    });
    suite('findInstructionFilesFor', () => {
        teardown(() => {
            sinon.restore();
        });
        test('finds correct instruction files', async () => {
            const rootFolderName = 'finds-instruction-files';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            const userPromptsFolderName = '/tmp/user-data/prompts';
            const userPromptsFolderUri = URI.file(userPromptsFolderName);
            sinon.stub(service, 'listPromptFiles')
                .returns(Promise.resolve([
                // local instructions
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file3.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file4.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                // user instructions
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file10.instructions.md'),
                    storage: PromptsStorage.user,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file11.instructions.md'),
                    storage: PromptsStorage.user,
                    type: PromptsType.instructions,
                },
            ]));
            // mock current workspace file structure
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/file1.prompt.md`,
                    contents: [
                        '## Some Header',
                        'some contents',
                        ' ',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file1.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 1.\'',
                        'applyTo: "**/*.tsx"',
                        '---',
                        'Some instructions 1 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file2.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 2.\'',
                        'applyTo: "**/folder1/*.tsx"',
                        '---',
                        'Some instructions 2 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file3.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 3.\'',
                        'applyTo: "**/folder2/*.tsx"',
                        '---',
                        'Some instructions 3 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file4.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 4.\'',
                        'applyTo: "src/build/*.tsx"',
                        '---',
                        'Some instructions 4 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file5.prompt.md`,
                    contents: [
                        '---',
                        'description: \'Prompt file 5.\'',
                        '---',
                        'Some prompt 5 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/folder1/main.tsx`,
                    contents: [
                        'console.log("Haalou!")'
                    ]
                }
            ]);
            // mock user data instructions
            await mockFiles(fileService, [
                {
                    path: `${userPromptsFolderName}/file10.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 10.\'',
                        'applyTo: "**/folder1/*.tsx"',
                        '---',
                        'Some instructions 10 contents.',
                    ]
                },
                {
                    path: `${userPromptsFolderName}/file11.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 11.\'',
                        'applyTo: "**/folder1/*.py"',
                        '---',
                        'Some instructions 11 contents.',
                    ]
                },
                {
                    path: `${userPromptsFolderName}/file12.prompt.md`,
                    contents: [
                        '---',
                        'description: \'Prompt file 12.\'',
                        '---',
                        'Some prompt 12 contents.',
                    ]
                }
            ]);
            const instructionFiles = await service.listPromptFiles(PromptsType.instructions, CancellationToken.None);
            const contextComputer = instaService.createInstance(ComputeAutomaticInstructions, undefined);
            const context = {
                files: new ResourceSet([
                    URI.joinPath(rootFolderUri, 'folder1/main.tsx'),
                ]),
                instructions: new ResourceSet(),
            };
            const result = new ChatRequestVariableSet();
            await contextComputer.addApplyingInstructions(instructionFiles, context, result, newInstructionsCollectionEvent(), CancellationToken.None);
            assert.deepStrictEqual(result.asArray().map(i => isPromptFileVariableEntry(i) ? i.value.path : undefined), [
                // local instructions
                URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md').path,
                URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md').path,
                // user instructions
                URI.joinPath(userPromptsFolderUri, 'file10.instructions.md').path,
            ], 'Must find correct instruction files.');
        });
        test('does not have duplicates', async () => {
            const rootFolderName = 'finds-instruction-files-without-duplicates';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            const userPromptsFolderName = '/tmp/user-data/prompts';
            const userPromptsFolderUri = URI.file(userPromptsFolderName);
            sinon.stub(service, 'listPromptFiles')
                .returns(Promise.resolve([
                // local instructions
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file3.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file4.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                // user instructions
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file10.instructions.md'),
                    storage: PromptsStorage.user,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file11.instructions.md'),
                    storage: PromptsStorage.user,
                    type: PromptsType.instructions,
                },
            ]));
            // mock current workspace file structure
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/file1.prompt.md`,
                    contents: [
                        '## Some Header',
                        'some contents',
                        ' ',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file1.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 1.\'',
                        'applyTo: "**/*.tsx"',
                        '---',
                        'Some instructions 1 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file2.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 2.\'',
                        'applyTo: "**/folder1/*.tsx"',
                        '---',
                        'Some instructions 2 contents. [](./file1.instructions.md)',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file3.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 3.\'',
                        'applyTo: "**/folder2/*.tsx"',
                        '---',
                        'Some instructions 3 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file4.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 4.\'',
                        'applyTo: "src/build/*.tsx"',
                        '---',
                        '[](./file3.instructions.md) Some instructions 4 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file5.prompt.md`,
                    contents: [
                        '---',
                        'description: \'Prompt file 5.\'',
                        '---',
                        'Some prompt 5 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/folder1/main.tsx`,
                    contents: [
                        'console.log("Haalou!")'
                    ]
                }
            ]);
            // mock user data instructions
            await mockFiles(fileService, [
                {
                    path: `${userPromptsFolderName}/file10.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 10.\'',
                        'applyTo: "**/folder1/*.tsx"',
                        '---',
                        'Some instructions 10 contents.',
                    ]
                },
                {
                    path: `${userPromptsFolderName}/file11.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 11.\'',
                        'applyTo: "**/folder1/*.py"',
                        '---',
                        'Some instructions 11 contents.',
                    ]
                },
                {
                    path: `${userPromptsFolderName}/file12.prompt.md`,
                    contents: [
                        '---',
                        'description: \'Prompt file 12.\'',
                        '---',
                        'Some prompt 12 contents.',
                    ]
                }
            ]);
            const instructionFiles = await service.listPromptFiles(PromptsType.instructions, CancellationToken.None);
            const contextComputer = instaService.createInstance(ComputeAutomaticInstructions, undefined);
            const context = {
                files: new ResourceSet([
                    URI.joinPath(rootFolderUri, 'folder1/main.tsx'),
                    URI.joinPath(rootFolderUri, 'folder1/index.tsx'),
                    URI.joinPath(rootFolderUri, 'folder1/constants.tsx'),
                ]),
                instructions: new ResourceSet(),
            };
            const result = new ChatRequestVariableSet();
            await contextComputer.addApplyingInstructions(instructionFiles, context, result, newInstructionsCollectionEvent(), CancellationToken.None);
            assert.deepStrictEqual(result.asArray().map(i => isPromptFileVariableEntry(i) ? i.value.path : undefined), [
                // local instructions
                URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md').path,
                URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md').path,
                // user instructions
                URI.joinPath(userPromptsFolderUri, 'file10.instructions.md').path,
            ], 'Must find correct instruction files.');
        });
        test('copilot-instructions and AGENTS.md', async () => {
            const rootFolderName = 'copilot-instructions-and-agents';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            // mock current workspace file structure
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/codestyle.md`,
                    contents: [
                        'Can you see this?',
                    ]
                },
                {
                    path: `${rootFolder}/AGENTS.md`,
                    contents: [
                        'What about this?',
                    ]
                },
                {
                    path: `${rootFolder}/README.md`,
                    contents: [
                        'Thats my project?',
                    ]
                },
                {
                    path: `${rootFolder}/.github/copilot-instructions.md`,
                    contents: [
                        'Be nice and friendly. Also look at instructions at #file:../codestyle.md and [more-codestyle.md](./more-codestyle.md).',
                    ]
                },
                {
                    path: `${rootFolder}/.github/more-codestyle.md`,
                    contents: [
                        'I like it clean.',
                    ]
                },
                {
                    path: `${rootFolder}/folder1/AGENTS.md`,
                    contents: [
                        'An AGENTS.md file in another repo'
                    ]
                }
            ]);
            const contextComputer = instaService.createInstance(ComputeAutomaticInstructions, undefined);
            const context = new ChatRequestVariableSet();
            context.add(toFileVariableEntry(URI.joinPath(rootFolderUri, 'README.md')));
            await contextComputer.collect(context, CancellationToken.None);
            assert.deepStrictEqual(context.asArray().map(i => isPromptFileVariableEntry(i) ? i.value.path : undefined).filter(e => !!e).sort(), [
                URI.joinPath(rootFolderUri, '.github/copilot-instructions.md').path,
                URI.joinPath(rootFolderUri, '.github/more-codestyle.md').path,
                URI.joinPath(rootFolderUri, 'AGENTS.md').path,
                URI.joinPath(rootFolderUri, 'codestyle.md').path,
            ].sort(), 'Must find correct instruction files.');
        });
    });
    suite('getCustomAgents', () => {
        teardown(() => {
            sinon.restore();
        });
        test('header with handOffs', async () => {
            const rootFolderName = 'custom-agents-with-handoffs';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/agents/agent1.agent.md`,
                    contents: [
                        '---',
                        'description: \'Agent file 1.\'',
                        'handoffs: [ { agent: "Edit", label: "Do it", prompt: "Do it now" } ]',
                        '---',
                    ]
                }
            ]);
            const result = (await service.getCustomAgents(CancellationToken.None)).map(agent => ({ ...agent, uri: URI.from(agent.uri) }));
            const expected = [
                {
                    name: 'agent1',
                    description: 'Agent file 1.',
                    handOffs: [{ agent: 'Edit', label: 'Do it', prompt: 'Do it now' }],
                    agentInstructions: {
                        content: '',
                        toolReferences: [],
                        metadata: undefined
                    },
                    model: undefined,
                    argumentHint: undefined,
                    tools: undefined,
                    target: undefined,
                    infer: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/agent1.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
            ];
            assert.deepEqual(result, expected, 'Must get custom agents.');
        });
        test('body with tool references', async () => {
            const rootFolderName = 'custom-agents';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            // mock current workspace file structure
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/agents/agent1.agent.md`,
                    contents: [
                        '---',
                        'description: \'Agent file 1.\'',
                        'tools: [ tool1, tool2 ]',
                        '---',
                        'Do it with #tool:tool1',
                    ]
                },
                {
                    path: `${rootFolder}/.github/agents/agent2.agent.md`,
                    contents: [
                        'First use #tool:tool2\nThen use #tool:tool1',
                    ]
                }
            ]);
            const result = (await service.getCustomAgents(CancellationToken.None)).map(agent => ({ ...agent, uri: URI.from(agent.uri) }));
            const expected = [
                {
                    name: 'agent1',
                    description: 'Agent file 1.',
                    tools: ['tool1', 'tool2'],
                    agentInstructions: {
                        content: 'Do it with #tool:tool1',
                        toolReferences: [{ name: 'tool1', range: { start: 11, endExclusive: 17 } }],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    argumentHint: undefined,
                    target: undefined,
                    infer: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/agent1.agent.md'),
                    source: { storage: PromptsStorage.local },
                },
                {
                    name: 'agent2',
                    agentInstructions: {
                        content: 'First use #tool:tool2\nThen use #tool:tool1',
                        toolReferences: [
                            { name: 'tool1', range: { start: 31, endExclusive: 37 } },
                            { name: 'tool2', range: { start: 10, endExclusive: 16 } }
                        ],
                        metadata: undefined
                    },
                    uri: URI.joinPath(rootFolderUri, '.github/agents/agent2.agent.md'),
                    source: { storage: PromptsStorage.local },
                }
            ];
            assert.deepEqual(result, expected, 'Must get custom agents.');
        });
        test('header with argumentHint', async () => {
            const rootFolderName = 'custom-agents-with-argument-hint';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/agents/agent1.agent.md`,
                    contents: [
                        '---',
                        'description: \'Code review agent.\'',
                        'argument-hint: \'Provide file path or code snippet to review\'',
                        'tools: [ code-analyzer, linter ]',
                        '---',
                        'I will help review your code for best practices.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/agents/agent2.agent.md`,
                    contents: [
                        '---',
                        'description: \'Documentation generator.\'',
                        'argument-hint: \'Specify function or class name to document\'',
                        '---',
                        'I generate comprehensive documentation.',
                    ]
                }
            ]);
            const result = (await service.getCustomAgents(CancellationToken.None)).map(agent => ({ ...agent, uri: URI.from(agent.uri) }));
            const expected = [
                {
                    name: 'agent1',
                    description: 'Code review agent.',
                    argumentHint: 'Provide file path or code snippet to review',
                    tools: ['code-analyzer', 'linter'],
                    agentInstructions: {
                        content: 'I will help review your code for best practices.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    target: undefined,
                    infer: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/agent1.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
                {
                    name: 'agent2',
                    description: 'Documentation generator.',
                    argumentHint: 'Specify function or class name to document',
                    agentInstructions: {
                        content: 'I generate comprehensive documentation.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    tools: undefined,
                    target: undefined,
                    infer: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/agent2.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
            ];
            assert.deepEqual(result, expected, 'Must get custom agents with argumentHint.');
        });
        test('header with target', async () => {
            const rootFolderName = 'custom-agents-with-target';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/agents/github-agent.agent.md`,
                    contents: [
                        '---',
                        'description: \'GitHub Copilot specialized agent.\'',
                        'target: \'github-copilot\'',
                        'tools: [ github-api, code-search ]',
                        '---',
                        'I am optimized for GitHub Copilot workflows.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/agents/vscode-agent.agent.md`,
                    contents: [
                        '---',
                        'description: \'VS Code specialized agent.\'',
                        'target: \'vscode\'',
                        'model: \'gpt-4\'',
                        '---',
                        'I am specialized for VS Code editor tasks.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/agents/generic-agent.agent.md`,
                    contents: [
                        '---',
                        'description: \'Generic agent without target.\'',
                        '---',
                        'I work everywhere.',
                    ]
                }
            ]);
            const result = (await service.getCustomAgents(CancellationToken.None)).map(agent => ({ ...agent, uri: URI.from(agent.uri) }));
            const expected = [
                {
                    name: 'github-agent',
                    description: 'GitHub Copilot specialized agent.',
                    target: 'github-copilot',
                    tools: ['github-api', 'code-search'],
                    agentInstructions: {
                        content: 'I am optimized for GitHub Copilot workflows.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    argumentHint: undefined,
                    infer: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/github-agent.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
                {
                    name: 'vscode-agent',
                    description: 'VS Code specialized agent.',
                    target: 'vscode',
                    model: 'gpt-4',
                    agentInstructions: {
                        content: 'I am specialized for VS Code editor tasks.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    argumentHint: undefined,
                    tools: undefined,
                    infer: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/vscode-agent.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
                {
                    name: 'generic-agent',
                    description: 'Generic agent without target.',
                    agentInstructions: {
                        content: 'I work everywhere.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    argumentHint: undefined,
                    tools: undefined,
                    target: undefined,
                    infer: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/generic-agent.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
            ];
            assert.deepEqual(result, expected, 'Must get custom agents with target attribute.');
        });
        test('agents with .md extension (no .agent.md)', async () => {
            const rootFolderName = 'custom-agents-md-extension';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/agents/demonstrate.md`,
                    contents: [
                        '---',
                        'description: \'Demonstrate agent.\'',
                        'tools: [ demo-tool ]',
                        '---',
                        'This is a demonstration agent using .md extension.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/agents/test.md`,
                    contents: [
                        'Test agent without header.',
                    ]
                }
            ]);
            const result = (await service.getCustomAgents(CancellationToken.None)).map(agent => ({ ...agent, uri: URI.from(agent.uri) }));
            const expected = [
                {
                    name: 'demonstrate',
                    description: 'Demonstrate agent.',
                    tools: ['demo-tool'],
                    agentInstructions: {
                        content: 'This is a demonstration agent using .md extension.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    argumentHint: undefined,
                    target: undefined,
                    infer: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/demonstrate.md'),
                    source: { storage: PromptsStorage.local },
                },
                {
                    name: 'test',
                    agentInstructions: {
                        content: 'Test agent without header.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    uri: URI.joinPath(rootFolderUri, '.github/agents/test.md'),
                    source: { storage: PromptsStorage.local },
                }
            ];
            assert.deepEqual(result, expected, 'Must get custom agents with .md extension from .github/agents/ folder.');
        });
    });
    suite('listPromptFiles - extensions', () => {
        test('Contributed prompt file', async () => {
            const uri = URI.parse('file://extensions/my-extension/textMate.instructions.md');
            const extension = {};
            const registered = service.registerContributedFile(PromptsType.instructions, uri, extension, 'TextMate Instructions', 'Instructions to follow when authoring TextMate grammars');
            const actual = await service.listPromptFiles(PromptsType.instructions, CancellationToken.None);
            assert.strictEqual(actual.length, 1);
            assert.strictEqual(actual[0].uri.toString(), uri.toString());
            assert.strictEqual(actual[0].name, 'TextMate Instructions');
            assert.strictEqual(actual[0].storage, PromptsStorage.extension);
            assert.strictEqual(actual[0].type, PromptsType.instructions);
            registered.dispose();
        });
        test('Custom agent provider', async () => {
            const agentUri = URI.parse('file://extensions/my-extension/myAgent.agent.md');
            const extension = {
                identifier: { value: 'test.my-extension' },
                enabledApiProposals: ['chatParticipantPrivate']
            };
            // Mock the agent file content
            await mockFiles(fileService, [
                {
                    path: agentUri.path,
                    contents: [
                        '---',
                        'description: \'My custom agent from provider\'',
                        'tools: [ tool1, tool2 ]',
                        '---',
                        'I am a custom agent from a provider.',
                    ]
                }
            ]);
            const provider = {
                provideCustomAgents: async (_options, _token) => {
                    return [
                        {
                            name: 'myAgent',
                            description: 'My custom agent from provider',
                            uri: agentUri
                        }
                    ];
                }
            };
            const registered = service.registerCustomAgentsProvider(extension, provider);
            const actual = await service.getCustomAgents(CancellationToken.None);
            assert.strictEqual(actual.length, 1);
            assert.strictEqual(actual[0].name, 'myAgent');
            assert.strictEqual(actual[0].description, 'My custom agent from provider');
            assert.strictEqual(actual[0].uri.toString(), agentUri.toString());
            assert.strictEqual(actual[0].source.storage, PromptsStorage.extension);
            if (actual[0].source.storage === PromptsStorage.extension) {
                assert.strictEqual(actual[0].source.type, ExtensionAgentSourceType.provider);
            }
            registered.dispose();
            // After disposal, the agent should no longer be listed
            const actualAfterDispose = await service.getCustomAgents(CancellationToken.None);
            assert.strictEqual(actualAfterDispose.length, 0);
        });
        test('Custom agent provider with isEditable', async () => {
            const readonlyAgentUri = URI.parse('file://extensions/my-extension/readonlyAgent.agent.md');
            const editableAgentUri = URI.parse('file://extensions/my-extension/editableAgent.agent.md');
            const extension = {
                identifier: { value: 'test.my-extension' },
                enabledApiProposals: ['chatParticipantPrivate']
            };
            // Mock the agent file content
            await mockFiles(fileService, [
                {
                    path: readonlyAgentUri.path,
                    contents: [
                        '---',
                        'description: \'Readonly agent from provider\'',
                        '---',
                        'I am a readonly agent.',
                    ]
                },
                {
                    path: editableAgentUri.path,
                    contents: [
                        '---',
                        'description: \'Editable agent from provider\'',
                        '---',
                        'I am an editable agent.',
                    ]
                }
            ]);
            const provider = {
                provideCustomAgents: async (_options, _token) => {
                    return [
                        {
                            name: 'readonlyAgent',
                            description: 'Readonly agent from provider',
                            uri: readonlyAgentUri,
                            isEditable: false
                        },
                        {
                            name: 'editableAgent',
                            description: 'Editable agent from provider',
                            uri: editableAgentUri,
                            isEditable: true
                        }
                    ];
                }
            };
            const registered = service.registerCustomAgentsProvider(extension, provider);
            // Spy on updateReadonly to verify it's called correctly
            const filesConfigService = instaService.get(IFilesConfigurationService);
            const updateReadonlySpy = sinon.spy(filesConfigService, 'updateReadonly');
            // List prompt files to trigger the readonly check
            await service.listPromptFiles(PromptsType.agent, CancellationToken.None);
            // Verify updateReadonly was called only for the non-editable agent
            assert.strictEqual(updateReadonlySpy.callCount, 1, 'updateReadonly should be called once');
            assert.ok(updateReadonlySpy.calledWith(readonlyAgentUri, true), 'updateReadonly should be called with readonly agent URI and true');
            const actual = await service.getCustomAgents(CancellationToken.None);
            assert.strictEqual(actual.length, 2);
            const readonlyAgent = actual.find(a => a.name === 'readonlyAgent');
            const editableAgent = actual.find(a => a.name === 'editableAgent');
            assert.ok(readonlyAgent, 'Readonly agent should be found');
            assert.ok(editableAgent, 'Editable agent should be found');
            assert.strictEqual(readonlyAgent.description, 'Readonly agent from provider');
            assert.strictEqual(editableAgent.description, 'Editable agent from provider');
            registered.dispose();
        });
        test('Contributed agent file that does not exist should not crash', async () => {
            const nonExistentUri = URI.parse('file://extensions/my-extension/nonexistent.agent.md');
            const existingUri = URI.parse('file://extensions/my-extension/existing.agent.md');
            const extension = {
                identifier: { value: 'test.my-extension' }
            };
            // Only create the existing file
            await mockFiles(fileService, [
                {
                    path: existingUri.path,
                    contents: [
                        '---',
                        'name: \'Existing Agent\'',
                        'description: \'An agent that exists\'',
                        '---',
                        'I am an existing agent.',
                    ]
                }
            ]);
            // Register both agents (one exists, one doesn't)
            const registered1 = service.registerContributedFile(PromptsType.agent, nonExistentUri, extension, 'NonExistent Agent', 'An agent that does not exist');
            const registered2 = service.registerContributedFile(PromptsType.agent, existingUri, extension, 'Existing Agent', 'An agent that exists');
            // Verify that getCustomAgents doesn't crash and returns only the valid agent
            const agents = await service.getCustomAgents(CancellationToken.None);
            // Should only get the existing agent, not the non-existent one
            assert.strictEqual(agents.length, 1, 'Should only return the agent that exists');
            assert.strictEqual(agents[0].name, 'Existing Agent');
            assert.strictEqual(agents[0].description, 'An agent that exists');
            assert.strictEqual(agents[0].uri.toString(), existingUri.toString());
            registered1.dispose();
            registered2.dispose();
        });
    });
    suite('findAgentSkills', () => {
        teardown(() => {
            sinon.restore();
        });
        test('should return undefined when USE_AGENT_SKILLS is disabled', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_SKILLS, false);
            const result = await service.findAgentSkills(CancellationToken.None);
            assert.strictEqual(result, undefined);
        });
        test('should return undefined when chat_preview_features_enabled is false', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_SKILLS, true);
            instaService.stub(IDefaultAccountService, {
                getDefaultAccount: () => Promise.resolve({ chat_preview_features_enabled: false })
            });
            // Recreate service with new stub
            service = disposables.add(instaService.createInstance(PromptsService));
            const result = await service.findAgentSkills(CancellationToken.None);
            assert.strictEqual(result, undefined);
            // Restore default stub for other tests
            instaService.stub(IDefaultAccountService, {
                getDefaultAccount: () => Promise.resolve({ chat_preview_features_enabled: true })
            });
        });
        test('should return undefined when USE_AGENT_SKILLS is enabled but chat_preview_features_enabled is false', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_SKILLS, true);
            instaService.stub(IDefaultAccountService, {
                getDefaultAccount: () => Promise.resolve({ chat_preview_features_enabled: false })
            });
            // Recreate service with new stub
            service = disposables.add(instaService.createInstance(PromptsService));
            const result = await service.findAgentSkills(CancellationToken.None);
            assert.strictEqual(result, undefined);
            // Restore default stub for other tests
            instaService.stub(IDefaultAccountService, {
                getDefaultAccount: () => Promise.resolve({ chat_preview_features_enabled: true })
            });
        });
        test('should find skills in workspace and user home', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_SKILLS, true);
            const rootFolderName = 'agent-skills-test';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            // Create mock filesystem with skills in both .github/skills and .claude/skills
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/skills/github-skill-1/SKILL.md`,
                    contents: [
                        '---',
                        'name: "GitHub Skill 1"',
                        'description: "A GitHub skill for testing"',
                        '---',
                        'This is GitHub skill 1 content',
                    ],
                },
                {
                    path: `${rootFolder}/.claude/skills/claude-skill-1/SKILL.md`,
                    contents: [
                        '---',
                        'name: "Claude Skill 1"',
                        'description: "A Claude skill for testing"',
                        '---',
                        'This is Claude skill 1 content',
                    ],
                },
                {
                    path: `${rootFolder}/.claude/skills/invalid-skill/SKILL.md`,
                    contents: [
                        '---',
                        'description: "Invalid skill, no name"',
                        '---',
                        'This is invalid skill content',
                    ],
                },
                {
                    path: `${rootFolder}/.github/skills/not-a-skill-dir/README.md`,
                    contents: ['This is not a skill'],
                },
                {
                    path: '/home/user/.claude/skills/personal-skill-1/SKILL.md',
                    contents: [
                        '---',
                        'name: "Personal Skill 1"',
                        'description: "A personal skill for testing"',
                        '---',
                        'This is personal skill 1 content',
                    ],
                },
                {
                    path: '/home/user/.claude/skills/not-a-skill/other-file.md',
                    contents: ['Not a skill file'],
                },
                {
                    path: '/home/user/.copilot/skills/copilot-skill-1/SKILL.md',
                    contents: [
                        '---',
                        'name: "Copilot Skill 1"',
                        'description: "A Copilot skill for testing"',
                        '---',
                        'This is Copilot skill 1 content',
                    ],
                },
            ]);
            const result = await service.findAgentSkills(CancellationToken.None);
            assert.ok(result, 'Should return results when agent skills are enabled');
            assert.strictEqual(result.length, 4, 'Should find 4 skills total');
            // Check project skills (both from .github/skills and .claude/skills)
            const projectSkills = result.filter(skill => skill.type === 'project');
            assert.strictEqual(projectSkills.length, 2, 'Should find 2 project skills');
            const githubSkill1 = projectSkills.find(skill => skill.name === 'GitHub Skill 1');
            assert.ok(githubSkill1, 'Should find GitHub skill 1');
            assert.strictEqual(githubSkill1.description, 'A GitHub skill for testing');
            assert.strictEqual(githubSkill1.uri.path, `${rootFolder}/.github/skills/github-skill-1/SKILL.md`);
            const claudeSkill1 = projectSkills.find(skill => skill.name === 'Claude Skill 1');
            assert.ok(claudeSkill1, 'Should find Claude skill 1');
            assert.strictEqual(claudeSkill1.description, 'A Claude skill for testing');
            assert.strictEqual(claudeSkill1.uri.path, `${rootFolder}/.claude/skills/claude-skill-1/SKILL.md`);
            // Check personal skills
            const personalSkills = result.filter(skill => skill.type === 'personal');
            assert.strictEqual(personalSkills.length, 2, 'Should find 2 personal skills');
            const personalSkill1 = personalSkills.find(skill => skill.name === 'Personal Skill 1');
            assert.ok(personalSkill1, 'Should find Personal Skill 1');
            assert.strictEqual(personalSkill1.description, 'A personal skill for testing');
            assert.strictEqual(personalSkill1.uri.path, '/home/user/.claude/skills/personal-skill-1/SKILL.md');
            const copilotSkill1 = personalSkills.find(skill => skill.name === 'Copilot Skill 1');
            assert.ok(copilotSkill1, 'Should find Copilot Skill 1');
            assert.strictEqual(copilotSkill1.description, 'A Copilot skill for testing');
            assert.strictEqual(copilotSkill1.uri.path, '/home/user/.copilot/skills/copilot-skill-1/SKILL.md');
        });
        test('should handle parsing errors gracefully', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_SKILLS, true);
            const rootFolderName = 'skills-error-test';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            // Create mock filesystem with malformed skill file in .github/skills
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/skills/valid-skill/SKILL.md`,
                    contents: [
                        '---',
                        'name: "Valid Skill"',
                        'description: "A valid skill"',
                        '---',
                        'Valid skill content',
                    ],
                },
                {
                    path: `${rootFolder}/.claude/skills/invalid-skill/SKILL.md`,
                    contents: [
                        '---',
                        'invalid yaml: [unclosed',
                        '---',
                        'Invalid skill content',
                    ],
                },
            ]);
            const result = await service.findAgentSkills(CancellationToken.None);
            // Should still return the valid skill, even if one has parsing errors
            assert.ok(result, 'Should return results even with parsing errors');
            assert.strictEqual(result.length, 1, 'Should find 1 valid skill');
            assert.strictEqual(result[0].name, 'Valid Skill');
            assert.strictEqual(result[0].type, 'project');
        });
        test('should return empty array when no skills found', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_SKILLS, true);
            const rootFolderName = 'empty-workspace';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            // Create empty mock filesystem
            await mockFiles(fileService, []);
            const result = await service.findAgentSkills(CancellationToken.None);
            assert.ok(result, 'Should return results array');
            assert.strictEqual(result.length, 0, 'Should find no skills');
        });
        test('should truncate long names and descriptions', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_SKILLS, true);
            const rootFolderName = 'truncation-test';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            const longName = 'A'.repeat(100); // Exceeds 64 characters
            const longDescription = 'B'.repeat(1500); // Exceeds 1024 characters
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/skills/long-skill/SKILL.md`,
                    contents: [
                        '---',
                        `name: "${longName}"`,
                        `description: "${longDescription}"`,
                        '---',
                        'Skill content',
                    ],
                },
            ]);
            const result = await service.findAgentSkills(CancellationToken.None);
            assert.ok(result, 'Should return results');
            assert.strictEqual(result.length, 1, 'Should find 1 skill');
            assert.strictEqual(result[0].name.length, 64, 'Name should be truncated to 64 characters');
            assert.strictEqual(result[0].description?.length, 1024, 'Description should be truncated to 1024 characters');
        });
        test('should remove XML tags from name and description', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_SKILLS, true);
            const rootFolderName = 'xml-test';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/skills/xml-skill/SKILL.md`,
                    contents: [
                        '---',
                        'name: "Skill <b>with</b> <em>XML</em> tags"',
                        'description: "Description with <strong>HTML</strong> and <span>other</span> tags"',
                        '---',
                        'Skill content',
                    ],
                },
            ]);
            const result = await service.findAgentSkills(CancellationToken.None);
            assert.ok(result, 'Should return results');
            assert.strictEqual(result.length, 1, 'Should find 1 skill');
            assert.strictEqual(result[0].name, 'Skill with XML tags', 'XML tags should be removed from name');
            assert.strictEqual(result[0].description, 'Description with HTML and other tags', 'XML tags should be removed from description');
        });
        test('should handle both truncation and XML removal', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_SKILLS, true);
            const rootFolderName = 'combined-test';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            const longNameWithXml = '<p>' + 'A'.repeat(100) + '</p>'; // Exceeds 64 chars and has XML
            const longDescWithXml = '<div>' + 'B'.repeat(1500) + '</div>'; // Exceeds 1024 chars and has XML
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/skills/combined-skill/SKILL.md`,
                    contents: [
                        '---',
                        `name: "${longNameWithXml}"`,
                        `description: "${longDescWithXml}"`,
                        '---',
                        'Skill content',
                    ],
                },
            ]);
            const result = await service.findAgentSkills(CancellationToken.None);
            assert.ok(result, 'Should return results');
            assert.strictEqual(result.length, 1, 'Should find 1 skill');
            // XML tags are removed first, then truncation happens
            assert.ok(!result[0].name.includes('<'), 'Name should not contain XML tags');
            assert.ok(!result[0].name.includes('>'), 'Name should not contain XML tags');
            assert.strictEqual(result[0].name.length, 64, 'Name should be truncated to 64 characters');
            assert.ok(!result[0].description?.includes('<'), 'Description should not contain XML tags');
            assert.ok(!result[0].description?.includes('>'), 'Description should not contain XML tags');
            assert.strictEqual(result[0].description?.length, 1024, 'Description should be truncated to 1024 characters');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9zZXJ2aWNlL3Byb21wdHNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM1RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzVHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFGQUFxRixDQUFDO0FBRS9ILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDeEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0s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