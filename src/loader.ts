import type * as docgen from 'react-docgen-typescript';
import type { LoaderContext } from 'webpack';

export default async function loader(this: LoaderContext<{ parser: docgen.FileParser }>, source: string) {
  const callback = this.async();
  const { parser } = await this.getOptions();
  let transformed = source;

  parser.parse(this.resource).forEach((component) => {
    const { displayName, rootExpression } = component;
    const rootName = rootExpression?.getName();
    const data = {
      description: component.description,
      displayName,
      props: Object.entries(component.props).map(([propName, prop]) => ({
        name: propName,
        description: prop.description,
        type: prop.type.name,
        defaultValue: prop.defaultValue,
        required: prop.required,
      })),
    };
    const json = JSON.stringify(data);

    if (rootName === 'default') {
      transformed = transformed.replace(/export\s+default\s+([\s\S]+)$/, (match, declaration) => {
        const id = Math.random().toString(36).substring(7);
        const varName = `_transformed_export_${id}`;
        const cleanDeclaration = declaration.trim().replace(/;$/, '');

        return [
          `const ${varName} = ${cleanDeclaration};`,
          `${varName}.__docgenInfo = ${json};`,
          `${varName}.displayName = ${varName}.displayName || '${displayName}';`,
          `export { ${varName} as default };`,
        ].join('\n');
      });
    } else {
      transformed = transformed + `${rootName}.__docgenInfo = ${json};`;
      transformed = transformed + `${rootName}.displayName = ${rootName}.displayName || '${displayName}';`;
    }
  });

  callback(null, transformed);
}
