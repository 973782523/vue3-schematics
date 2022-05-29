/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
    apply,
    applyTemplates,
    chain,
    FileOperator,
    filter,
    forEach,
    mergeWith,
    move,
    noop,
    Rule,
    SchematicsException,
    Tree,
    url,
} from '@angular-devkit/schematics';
import {strings} from '@angular-devkit/core';

// import * as ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
// import {addDeclarationToModule, addExportToModule} from '@schematics/angular/utility/ast-utils';
// import {InsertChange} from '@schematics/angular/utility/change';
// import {buildRelativePath} from '@schematics/angular/utility/find-module';
import {parseName} from '@schematics/angular/utility/parse-name';
import {validateHtmlSelector} from '@schematics/angular/utility/validation';
import {buildDefaultPath, getWorkspace} from '@schematics/angular/utility/workspace';
import {Schema as ComponentOptions, Style} from './schema';
import {findModuleFromOptionsClone} from "./find-module-clone";

// function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
//     const text = host.read(modulePath);
//     if (text === null) {
//         throw new SchematicsException(`File ${modulePath} does not exist.`);
//     }
//     const sourceText = text.toString('utf-8');
//
//     return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
// }

// 把组件添加的模块上的
// function addDeclarationToNgModule(options: ComponentOptions): Rule {
//     return (host: Tree) => {
//         if (options.skipImport || options.standalone || !options.module) {
//             return host;
//         }
//
//         options.type = options.type != null ? options.type : 'Component';
//
//         const modulePath = options.module;
//         const source = readIntoSourceFile(host, modulePath);
//
//         const componentPath =
//             `/${options.path}/` +
//             (options.flat ? '' : strings.dasherize(options.name) + '/') +
//             strings.dasherize(options.name) +
//             (options.type ? '.' : '') +
//             strings.dasherize(options.type);
//         const relativePath = buildRelativePath(modulePath, componentPath);
//         const classifiedName = strings.classify(options.name) + strings.classify(options.type);
//         const declarationChanges = addDeclarationToModule(
//             source,
//             modulePath,
//             classifiedName,
//             relativePath,
//         );
//
//         const declarationRecorder = host.beginUpdate(modulePath);
//         for (const change of declarationChanges) {
//             if (change instanceof InsertChange) {
//                 declarationRecorder.insertLeft(change.pos, change.toAdd);
//             }
//         }
//         host.commitUpdate(declarationRecorder);
//
//         if (options.export) {
//             // Need to refresh the AST because we overwrote the file in the host.
//             const source = readIntoSourceFile(host, modulePath);
//
//             const exportRecorder = host.beginUpdate(modulePath);
//             const exportChanges = addExportToModule(
//                 source,
//                 modulePath,
//                 strings.classify(options.name) + strings.classify(options.type),
//                 relativePath,
//             );
//
//             for (const change of exportChanges) {
//                 if (change instanceof InsertChange) {
//                     exportRecorder.insertLeft(change.pos, change.toAdd);
//                 }
//             }
//             host.commitUpdate(exportRecorder);
//         }
//
//         return host;
//     };
// }

function buildSelector(options: ComponentOptions, projectPrefix: string) {
    let selector = strings.dasherize(options.name);
    if (options.prefix) {
        selector = `${options.prefix}-${selector}`;
    } else if (options.prefix === undefined && projectPrefix) {
        selector = `${projectPrefix}-${selector}`;
    }

    return selector;
}

export default function (options: ComponentOptions): Rule {
    return async (host: Tree) => {
        // 读取angular.json 文件
        const workspace = await getWorkspace(host);
        /*
        * 拿到的值有两个方法
        * extensions
        * > extensions[xxxx]  拿到当前的某某属性
        * projects 就是angular.json中的project属性, 也有一些方法
        * > 比如 .projects.get('xx')  拿到对应的属性
        * */
        const defaultProjectName = workspace.extensions['defaultProject'];
        // 如果不--project 编写, 就取默认的
        const project = workspace.projects.get((options.project || defaultProjectName) as string);
        // 如果没有就报错
        if (!project) {
            throw new SchematicsException(`Project "${options.project}" does not exist.`);
        }
        // 如果没有设置--path
        if (options.path === undefined) {
            // 构建用于生成的默认项目路径。
            // @param项目将生成其默认路径的项目。
            options.path = buildDefaultPath(project);
            // options.path=  /src/app
        }
        // 找到传递给示意图的一组选项所引用的模块
        // export const MODULE_EXT = '.module.ts'; 找到对应的默认
        // export const ROUTING_MODULE_EXT = '-routing.module.ts';
        // options.module = findModuleFromOptions(host, options);
        options.module = findModuleFromOptionsClone(host, options as any)
        const parsedPath = parseName(options.path as string, options.name);
        // 自己设置的name
        options.name = parsedPath.name;
        // 当前所在的地址
        options.path = parsedPath.path;
        // 选择器, 加前缀, 例如 selector: app-xxx
        // selector = `${options.prefix}-${selector}`;
        options.selector =
            options.selector || buildSelector(options, (project && project.prefix) || '');
        // 必须以字母开头，并且必须只包含字母数字字符或破折号。
        validateHtmlSelector(options.selector);
        //是否生成css文件夹  --inlineStyle 别名  --s
        const skipStyleFile = options.inlineStyle || options.style === Style.None;
        const templateSource = apply(url('./files'), [
            skipStyleFile ? filter((path) => !path.endsWith('.__style__.template')) : noop(),
            options.inlineTemplate ? filter((path) => !path.endsWith('.ts.template')) : noop(),
            options.inlineVue ? filter((path) => !path.endsWith('.vue.template')) : noop(),
            applyTemplates({
                ...strings,
                'if-flat': (s: string) => (options.flat ? '' : s),
                ...options,
            }),
            !options.type
                ? forEach(((file) => {
                    return file.path.includes('..')
                        ? {
                            content: file.content,
                            path: file.path.replace('..', '.'),
                        }
                        : file;
                }) as FileOperator)
                : noop(),
            move(parsedPath.path),
        ]);
// 将多个规则链接到一个规则中。
//     return chain([addDeclarationToNgModule(options), mergeWith(templateSource)]);
        return chain([mergeWith(templateSource)]);
    };
}
