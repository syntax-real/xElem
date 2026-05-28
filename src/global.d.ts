declare module '*.module.scss' {
    const classes: { readonly [key: string]: string };
    export default classes;
}

declare module '*.scss' {
    const content: Record<string, string>;
    export default content;
}