import fs from "node:fs";
import path from "node:path";

import { parse } from "react-docgen-typescript/lib/parser.js";
import type { ParserOptions } from "react-docgen-typescript/lib/parser.js";
import { describe, expect, it } from "vitest";

import {
  generateDocgenCodeBlock,
  type GeneratorOptions,
} from "../generateDocgenCodeBlock";

const defaultParserOptions = { shouldIncludeExpression: true };

function getGeneratorOptions(
  parserOptions: ParserOptions
): (filename: string) => GeneratorOptions {
  return (filename: string) => {
    const filePath = path.resolve(__dirname, "__fixtures__", filename);

    return {
      filename,
      source: fs.readFileSync(filePath, "utf8"),
      componentDocs: parse(filePath, parserOptions),
      docgenCollectionName: null,
      setDisplayName: true,
      typePropName: "type",
    };
  };
}

function loadFixtureTests(): GeneratorOptions[] {
  return fs
    .readdirSync(path.resolve(__dirname, "__fixtures__"))
    .map(getGeneratorOptions(defaultParserOptions));
}

const fixtureTests: GeneratorOptions[] = loadFixtureTests();
const simpleFixture = fixtureTests.find((f) => f.filename === "Simple.tsx")!;
const displayNameFixture = fixtureTests.find(
  (f) => f.filename === "DisplayName.tsx"
)!;
const textOnlyFixture = fixtureTests.find(
  (f) => f.filename === "TextOnlyComponent.tsx"
)!;

describe("component fixture", () => {
  fixtureTests.forEach((generatorOptions) => {
    it(`${generatorOptions.filename} has code block generated`, () => {
      expect(generateDocgenCodeBlock(generatorOptions)).toMatchSnapshot();
    });
  });
});

it("adds component to docgen collection", () => {
  expect(
    generateDocgenCodeBlock({
      ...simpleFixture,
      docgenCollectionName: "STORYBOOK_REACT_CLASSES",
    })
  ).toMatchSnapshot();
});

it("adds component with display name to docgen collection", () => {
  expect(
    generateDocgenCodeBlock({
      ...displayNameFixture,
      docgenCollectionName: "STORYBOOK_REACT_CLASSES",
    })
  ).toMatchSnapshot();
});

it("generates value info for enums", () => {
  expect(
    generateDocgenCodeBlock(
      getGeneratorOptions({
        ...defaultParserOptions,
        shouldExtractLiteralValuesFromEnum: true,
      })("DefaultPropValue.tsx")
    )
  ).toMatchSnapshot();
});

it("preserves text-only JSX source while appending docgen output", () => {
  const output = generateDocgenCodeBlock(textOnlyFixture);

  expect(output).toContain("<div>Test only component</div>");
  expect(output).toContain("SimpleComponent.__docgenInfo");
});
