export interface Schema {
    name: string,
    skipImport?: boolean,
    type?: string,
    path?: string,
    flat?: boolean,
    module?: string,
    standalone?: string
    export?: boolean,
    prefix?: string,
    project?: string,
    selector?: string,
    inlineTemplate?: boolean,
    inlineStyle?: boolean,
    style?: string,
    skipTests?: boolean,
    defaultProject?: string,
    inlineVue?: boolean
}

export enum Style {
    Css = 'css',
    Scss = 'scss',
    Sass = 'sass',
    Less = 'less',
    None = 'none'
}
