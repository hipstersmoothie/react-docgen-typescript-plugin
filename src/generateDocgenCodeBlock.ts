import path from "node:path";

import ts from "typescript";
import type { ComponentDoc, PropItem } from "react-docgen-typescript";

export interface GeneratorOptions {
  filename: string;
  source: string;
  componentDocs: ComponentDoc[];
  docgenCollectionName: string | null;
  setDisplayName: boolean;
  typePropName: string;
}

type DefaultValue = {
  value: string | number | boolean;
};

type TypeValue = {
  value: string;
};

function isDefaultValue(value: unknown): value is DefaultValue {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "value" in value &&
    (typeof value.value === "string" ||
      typeof value.value === "number" ||
      typeof value.value === "boolean")
  );
}

function isTypeValueArray(value: unknown): value is TypeValue[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry !== null &&
        typeof entry === "object" &&
        "value" in entry &&
        typeof entry.value === "string"
    )
  );
}

function isStatement(statement: ts.Statement | null): statement is ts.Statement {
  return statement !== null;
}

/**
 * Gets the identifier name for the component.
 *
 * If the component has a displayName that differs from its
 * identifier, this will return the identifier.
 */
function getComponentIdentifier(d: ComponentDoc): string {
  return d.expression?.getName() || d.displayName;
}

/**
 * Inserts a ts-ignore comment above the supplied statement.
 *
 * It is used to work around type errors related to fields like __docgenInfo not
 * being defined on types. It also prevents compile errors related to attempting
 * to assign to nonexistent components, which can happen due to incorrect
 * detection of component names when using the parser.
 * ```
 * // @ts-ignore
 * ```
 * @param statement
 */
function insertTsIgnoreBeforeStatement(statement: ts.Statement): ts.Statement {
  ts.setSyntheticLeadingComments(statement, [
    {
      text: " @ts-ignore", // Leading space is important here
      kind: ts.SyntaxKind.SingleLineCommentTrivia,
      pos: -1,
      end: -1,
    },
  ]);
  return statement;
}

/**
 * Set component display name.
 *
 * ```
 * SimpleComponent.displayName = "SimpleComponent";
 * ```
 */
function setDisplayName(d: ComponentDoc): ts.Statement | null {
  // If the expression name doesn't match the display name,
  // then we know the component has already set a displayName
  if (d.expression && d.expression.getName() !== d.displayName) {
    return null;
  }

  return insertTsIgnoreBeforeStatement(
    ts.factory.createExpressionStatement(
      ts.factory.createBinaryExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(getComponentIdentifier(d)),
          ts.factory.createIdentifier("displayName")
        ),
        ts.SyntaxKind.EqualsToken,
        ts.factory.createStringLiteral(d.displayName)
      )
    )
  );
}

/**
 * Set a component prop description.
 * ```
 * SimpleComponent.__docgenInfo.props.someProp = {
 *   defaultValue: "blue",
 *   description: "Prop description.",
 *   name: "someProp",
 *   required: true,
 *   type: "'blue' | 'green'",
 * }
 * ```
 *
 * @param propName Prop name
 * @param prop Prop definition from `ComponentDoc.props`
 * @param options Generator options.
 */
function createPropDefinition(
  propName: string,
  prop: PropItem,
  options: GeneratorOptions
) {
  const createNumericDefaultValue = (value: number) => {
    if (value < 0) {
      return ts.factory.createPrefixUnaryExpression(
        ts.SyntaxKind.MinusToken,
        ts.factory.createNumericLiteral(-value)
      );
    }

    return ts.factory.createNumericLiteral(value);
  };

  /**
   * Set default prop value.
   *
   * ```
   * SimpleComponent.__docgenInfo.props.someProp.defaultValue = null;
   * SimpleComponent.__docgenInfo.props.someProp.defaultValue = {
   *   value: "blue",
   * };
   * ```
   *
   * @param defaultValue Default prop value or null if not set.
   */
  const setDefaultValue = (defaultValue: unknown) =>
    ts.factory.createPropertyAssignment(
      ts.factory.createStringLiteral("defaultValue"),
      isDefaultValue(defaultValue)
        ? ts.factory.createObjectLiteralExpression([
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier("value"),
              typeof defaultValue.value === "string"
                ? ts.factory.createStringLiteral(defaultValue.value)
                : typeof defaultValue.value === "number"
                ? createNumericDefaultValue(defaultValue.value)
                : defaultValue.value
                ? ts.factory.createTrue()
                : ts.factory.createFalse()
            ),
          ])
        : ts.factory.createNull()
    );

  /** Set a property with a string value */
  const setStringLiteralField = (fieldName: string, fieldValue: string) =>
    ts.factory.createPropertyAssignment(
      ts.factory.createStringLiteral(fieldName),
      ts.factory.createStringLiteral(fieldValue)
    );

  /**
   * ```
   * SimpleComponent.__docgenInfo.props.someProp.description = "Prop description.";
   * ```
   * @param description Prop description.
   */
  const setDescription = (description: string) =>
    setStringLiteralField("description", description);

  /**
   * ```
   * SimpleComponent.__docgenInfo.props.someProp.name = "someProp";
   * ```
   * @param name Prop name.
   */
  const setName = (name: string) => setStringLiteralField("name", name);

  /**
   * ```
   * SimpleComponent.__docgenInfo.props.someProp.required = true;
   * ```
   * @param required Whether prop is required or not.
   */
  const setRequired = (required: boolean) =>
    ts.factory.createPropertyAssignment(
      ts.factory.createStringLiteral("required"),
      required ? ts.factory.createTrue() : ts.factory.createFalse()
    );

  /**
   * ```
   * SimpleComponent.__docgenInfo.props.someProp.type = {
   *  name: "enum",
   *  value: [ { value: "\"blue\"" }, { value: "\"green\""} ]
   * }
   * ```
   * @param [typeValue] Prop value (for enums)
   */
  const setValue = (typeValue: unknown) =>
    isTypeValueArray(typeValue)
      ? ts.factory.createPropertyAssignment(
          ts.factory.createStringLiteral("value"),
          ts.factory.createArrayLiteralExpression(
            typeValue.map((typeValueItem) =>
              ts.factory.createObjectLiteralExpression([
                setStringLiteralField("value", typeValueItem.value),
              ])
            )
          )
        )
      : undefined;

  /**
   * ```
   * SimpleComponent.__docgenInfo.props.someProp.type = { name: "'blue' | 'green'"}
   * ```
   * @param typeName Prop type name.
   * @param [typeValue] Prop value (for enums)
   */
  const setType = (typeName: string, typeValue: unknown) => {
    const objectFields = [setStringLiteralField("name", typeName)];
    const valueField = setValue(typeValue);

    if (valueField) {
      objectFields.push(valueField);
    }

    return ts.factory.createPropertyAssignment(
      ts.factory.createStringLiteral(options.typePropName),
      ts.factory.createObjectLiteralExpression(objectFields)
    );
  };

  return ts.factory.createPropertyAssignment(
    ts.factory.createStringLiteral(propName),
    ts.factory.createObjectLiteralExpression([
      setDefaultValue(prop.defaultValue),
      setDescription(prop.description),
      setName(prop.name),
      setRequired(prop.required),
      setType(prop.type.name, prop.type.value),
    ])
  );
}

/**
 * Adds a component's docgen info to the global docgen collection.
 *
 * ```
 * if (typeof STORYBOOK_REACT_CLASSES !== "undefined") {
 *   STORYBOOK_REACT_CLASSES["src/.../SimpleComponent.tsx"] = {
 *     name: "SimpleComponent",
 *     docgenInfo: SimpleComponent.__docgenInfo,
 *     path: "src/.../SimpleComponent.tsx",
 *   };
 * }
 * ```
 *
 * @param d Component doc.
 * @param docgenCollectionName Global docgen collection variable name.
 * @param relativeFilename Relative file path of the component source file.
 */
function insertDocgenIntoGlobalCollection(
  d: ComponentDoc,
  docgenCollectionName: string,
  relativeFilename: string
): ts.Statement {
  return insertTsIgnoreBeforeStatement(
    ts.factory.createIfStatement(
      ts.factory.createBinaryExpression(
        ts.factory.createTypeOfExpression(
          ts.factory.createIdentifier(docgenCollectionName)
        ),
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.factory.createStringLiteral("undefined")
      ),
      insertTsIgnoreBeforeStatement(
        ts.factory.createExpressionStatement(
          ts.factory.createBinaryExpression(
            ts.factory.createElementAccessExpression(
              ts.factory.createIdentifier(docgenCollectionName),
              ts.factory.createStringLiteral(
                `${relativeFilename}#${d.displayName}`
              )
            ),
            ts.SyntaxKind.EqualsToken,
            ts.factory.createObjectLiteralExpression([
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier("docgenInfo"),
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createIdentifier(getComponentIdentifier(d)),
                  ts.factory.createIdentifier("__docgenInfo")
                )
              ),
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier("name"),
                ts.factory.createStringLiteral(d.displayName)
              ),
              ts.factory.createPropertyAssignment(
                ts.factory.createIdentifier("path"),
                ts.factory.createStringLiteral(
                  `${relativeFilename}#${d.displayName}`
                )
              ),
            ])
          )
        )
      )
    )
  );
}

/**
 * Sets the field `__docgenInfo` for the component specified by the component
 * doc with the docgen information.
 *
 * ```
 * SimpleComponent.__docgenInfo = {
 *   description: ...,
 *   displayName: ...,
 *   props: ...,
 * }
 * ```
 *
 * @param d Component doc.
 * @param options Generator options.
 */
function setComponentDocGen(
  d: ComponentDoc,
  options: GeneratorOptions
): ts.Statement {
  return insertTsIgnoreBeforeStatement(
    ts.factory.createExpressionStatement(
      ts.factory.createBinaryExpression(
        // SimpleComponent.__docgenInfo
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(getComponentIdentifier(d)),
          ts.factory.createIdentifier("__docgenInfo")
        ),
        ts.SyntaxKind.EqualsToken,
        ts.factory.createObjectLiteralExpression([
          // SimpleComponent.__docgenInfo.description
          ts.factory.createPropertyAssignment(
            ts.factory.createStringLiteral("description"),
            ts.factory.createStringLiteral(d.description)
          ),
          // SimpleComponent.__docgenInfo.displayName
          ts.factory.createPropertyAssignment(
            ts.factory.createStringLiteral("displayName"),
            ts.factory.createStringLiteral(d.displayName)
          ),
          // SimpleComponent.__docgenInfo.props
          ts.factory.createPropertyAssignment(
            ts.factory.createStringLiteral("props"),
            ts.factory.createObjectLiteralExpression(
              Object.entries(d.props).map(([propName, prop]) =>
                createPropDefinition(propName, prop, options)
              )
            )
          ),
        ])
      )
    )
  );
}

export function generateDocgenCodeBlock(options: GeneratorOptions): string {
  const sourceFile = ts.createSourceFile(
    options.filename,
    options.source,
    ts.ScriptTarget.ESNext
  );

  const relativeFilename = path
    .relative("./", path.resolve("./", options.filename))
    .replace(/\\/g, "/");

  const wrapInTryStatement = (statements: ts.Statement[]): ts.TryStatement =>
    ts.factory.createTryStatement(
      ts.factory.createBlock(statements, true),
      ts.factory.createCatchClause(
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier("__react_docgen_typescript_loader_error")
        ),
        ts.factory.createBlock([])
      ),
      undefined
    );

  const codeBlocks = options.componentDocs.map((d) =>
    wrapInTryStatement(
      [
        options.setDisplayName ? setDisplayName(d) : null,
        setComponentDocGen(d, options),
        options.docgenCollectionName === null ||
        options.docgenCollectionName === undefined
          ? null
          : insertDocgenIntoGlobalCollection(
              d,
              options.docgenCollectionName,
              relativeFilename
            ),
      ].filter(isStatement)
    )
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printNode = (sourceNode: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, sourceNode, sourceFile);

  // Preserve the incoming module source exactly and only append generated docgen
  // statements. Reprinting consumer source through the TypeScript printer has
  // broken JSX text children before:
  // https://github.com/strothj/react-docgen-typescript-loader/issues/7
  const result = codeBlocks.reduce(
    (acc, node) => `${acc}\n${printNode(node)}`,
    options.source
  );

  return result;
}
