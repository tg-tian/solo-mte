#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const inquirer = require('inquirer');


const validateProjectName = (name) => {
    const reg = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
    if (!reg.test(name)) {
        return '项目名称不合法！必须以英文或下划线开头，仅包含英文、数字、下划线、中划线';
    }
    return true;
};

program
    .name('farris-create-vueflow')
    .usage('[project-name]')
    .arguments('[project-name]')
    .action(async (projectName) => {
        try {
            if (!projectName) {
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'projectName',
                        message: '请输入项目名称：',
                        validate: validateProjectName,
                        default: 'farris-flow-extension',
                    }
                ]);
                projectName = answers.projectName;
            } else {
                const validateResult = validateProjectName(projectName);
                if (validateResult !== true) {
                    console.error(chalk.red(`❌ ${validateResult}`));
                    process.exit(1);
                }
            }

            const targetDir = path.resolve(process.cwd(), projectName);
            if (fs.existsSync(targetDir)) {
                console.error(chalk.red(`❌ 目录 ${projectName} 已存在！`));
                process.exit(1);
            }

            const templateDir = path.resolve(__dirname, '../template');
            await fs.copy(templateDir, targetDir);

            const gitignoreTemplatePath = path.join(targetDir, 'gitignore.template');
            const gitignorePath = path.join(targetDir, '.gitignore');
            if (fs.existsSync(gitignoreTemplatePath)) {
                await fs.rename(gitignoreTemplatePath, gitignorePath);
            }

            const packageJsonPath = path.join(targetDir, 'package.json');
            let packageJson = await fs.readJson(packageJsonPath);
            packageJson.name = projectName;
            await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

            console.log(chalk.green(`✅ 项目创建成功！路径：${targetDir}`));
            console.log(chalk.cyan('下一步操作：'));
            console.log(chalk.cyan(`  cd ${projectName}`));
            console.log(chalk.cyan('  pnpm install'));
            console.log(chalk.cyan('  pnpm dev'));
        } catch (err) {
            console.error(chalk.red(`❌ 创建失败：${err.message}`));
            process.exit(1);
        }
    });

program.parse(process.argv);
