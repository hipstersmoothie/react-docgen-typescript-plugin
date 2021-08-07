import path from "path";
import ts from "typescript";
import { ComponentDoc, PropItem } from "react-docgen-typescript";

export interface GeneratorOptions {
  filename: string;
  source: string;
  componentDocs: ComponentDoc[];
  docgenCollectionName: string | null;
  setDisplayName: boolean;
  typePropName: string;
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
function setDisplayName(d: ComponentDoc): ts.Statement {
  return insertTsIgnoreBeforeStatement(
    ts.createExpressionStatement(
      ts.createBinary(
        ts.createPropertyAccess(
          ts.createIdentifier(d.displayName),
          ts.createIdentifier("displayName")
        ),
        ts.SyntaxKind.EqualsToken,
        ts.createLiteral(d.displayName)
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
  const setDefaultValue = (
    defaultValue: { value: string | number | boolean } | null
  ) =>
    ts.createPropertyAssignment(
      ts.createLiteral("defaultValue"),
      // Use a more extensive check on defaultValue. Sometimes the parser
      // returns an empty object.
      defaultValue !== null &&
        defaultValue !== undefined &&
        typeof defaultValue === "object" &&
        "value" in defaultValue &&
        (typeof defaultValue.value === "string" ||
          typeof defaultValue.value === "number" ||
          typeof defaultValue.value === "boolean")
        ? ts.createObjectLiteral([
            ts.createPropertyAssignment(
              ts.createIdentifier("value"),
              ts.createLiteral(defaultValue.value)
            ),
          ])
        : ts.createNull()
    );

  /** Set a property with a string value */
  const setStringLiteralField = (fieldName: string, fieldValue: string) =>
    ts.createPropertyAssignment(
      ts.createLiteral(fieldName),
      ts.createLiteral(fieldValue)
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
   * SimpleComponent.__docgenInfo.props.someProp.tags = { "tagName": "tagValue" };
   * ```
   * @param tags Prop tags.
   */
  const setTags = (tags: Record<string, string>) =>
      ts.createPropertyAssignment(
        ts.createLiteral("tags"),
        ts.createObjectLiteral(
            Object.entries(tags).map(([tagName, tagValue]) =>
                setStringLiteralField(tagName, tagValue)
            )
        )
      );

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
    ts.createPropertyAssignment(
      ts.createLiteral("required"),
      required ? ts.createTrue() : ts.createFalse()
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
  const setValue = (typeValue?: any[]) =>
    Array.isArray(typeValue) &&
    typeValue.every((value) => typeof value.value === "string")
      ? ts.createPropertyAssignment(
          ts.createLiteral("value"),
          ts.createArrayLiteral(
            typeValue.map((value) =>
              ts.createObjectLiteral([
                setStringLiteralField("value", value.value),
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
  const setType = (typeName: string, typeValue?: any[]) => {
    const objectFields = [setStringLiteralField("name", typeName)];
    const valueField = setValue(typeValue);

    if (valueField) {
      objectFields.push(valueField);
    }

    return ts.createPropertyAssignment(
      ts.createLiteral(options.typePropName),
      ts.createObjectLiteral(objectFields)
    );
  };

  return ts.createPropertyAssignment(
    ts.createLiteral(propName),
    ts.createObjectLiteral([
      setDefaultValue(prop.defaultValue),
      setDescription(prop.description),
      ...(prop.tags ? [setTags(prop.tags)] : []),
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
    ts.createIf(
      ts.createBinary(
        ts.createTypeOf(ts.createIdentifier(docgenCollectionName)),
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.createLiteral("undefined")
      ),
      insertTsIgnoreBeforeStatement(
        ts.createStatement(
          ts.createBinary(
            ts.createElementAccess(
              ts.createIdentifier(docgenCollectionName),
              ts.createLiteral(`${relativeFilename}#${d.displayName}`)
            ),
            ts.SyntaxKind.EqualsToken,
            ts.createObjectLiteral([
              ts.createPropertyAssignment(
                ts.createIdentifier("docgenInfo"),
                ts.createPropertyAccess(
                  ts.createIdentifier(d.displayName),
                  ts.createIdentifier("__docgenInfo")
                )
              ),
              ts.createPropertyAssignment(
                ts.createIdentifier("name"),
                ts.createLiteral(d.displayName)
              ),
              ts.createPropertyAssignment(
                ts.createIdentifier("path"),
                ts.createLiteral(`${relativeFilename}#${d.displayName}`)
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
    ts.createStatement(
      ts.createBinary(
        // SimpleComponent.__docgenInfo
        ts.createPropertyAccess(
          ts.createIdentifier(d.displayName),
          ts.createIdentifier("__docgenInfo")
        ),
        ts.SyntaxKind.EqualsToken,
        ts.createObjectLiteral([
          // SimpleComponent.__docgenInfo.description
          ts.createPropertyAssignment(
            ts.createLiteral("description"),
            ts.createLiteral(d.description)
          ),
          // SimpleComponent.__docgenInfo.tags
          ...(d.tags ? [ts.createPropertyAssignment(
              ts.createLiteral("tags"),
              ts.createObjectLiteral(
                  Object.entries<string>(d.tags).map(([tagName, tagValue]) =>
                      ts.createPropertyAssignment(
                          ts.createLiteral(tagName),
                          ts.createLiteral(tagValue)
                      )
                  )
              )
          )] : []),
          // SimpleComponent.__docgenInfo.displayName
          ts.createPropertyAssignment(
            ts.createLiteral("displayName"),
            ts.createLiteral(d.displayName)
          ),
          // SimpleComponent.__docgenInfo.props
          ts.createPropertyAssignment(
            ts.createLiteral("props"),
            ts.createObjectLiteral(
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
    ts.createTry(
      ts.createBlock(statements, true),
      ts.createCatchClause(
        ts.createVariableDeclaration(
          ts.createIdentifier("__react_docgen_typescript_loader_error")
        ),
        ts.createBlock([])
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
      ].filter((s) => s !== null) as ts.Statement[]
    )
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printNode = (sourceNode: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, sourceNode, sourceFile);

  // Concat original source code with code from generated code blocks.
  const result = codeBlocks.reduce(
    (acc, node) => `${acc}\n${printNode(node)}`,

    // Use original source text rather than using printNode on the parsed form
    // to prevent issue where literals are stripped within components.
    // Ref: https://github.com/strothj/react-docgen-typescript-loader/issues/7
    options.source
  );

  return result;
}
