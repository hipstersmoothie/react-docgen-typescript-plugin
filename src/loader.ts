import path from "node:path";

import * as docGen from "react-docgen-typescript";
import ts from "typescript";
import type { LoaderContext } from "webpack";

import {
  generateDocgenCodeBlock,
  type GeneratorOptions,
} from "./generateDocgenCodeBlock";

export type RegisteredDocgenLoaderOptions = {
  docgenOptions: docGen.ParserOptions;
  generateOptions: Pick<
    GeneratorOptions,
    "docgenCollectionName" | "setDisplayName" | "typePropName"
  >;
  compilerOptions: ts.CompilerOptions;
  fileNames?: string[];
};

type DirectDocgenLoaderOptions = Partial<RegisteredDocgenLoaderOptions> &
  Partial<
    Pick<
      GeneratorOptions,
      "docgenCollectionName" | "setDisplayName" | "typePropName"
    >
  > &
  docGen.ParserOptions;

type DocgenLoaderOptions = DirectDocgenLoaderOptions & {
  configId?: string;
};

type ResolvedDocgenLoaderOptions = {
  cacheKey?: string;
  options: RegisteredDocgenLoaderOptions;
};

type ParserProgramState = {
  parser: docGen.FileParser;
  program?: ts.Program;
  programRootNamesKey?: string;
  resourcePaths: Set<string>;
};

const defaultGenerateOptions = {
  docgenCollectionName: "STORYBOOK_REACT_CLASSES",
  setDisplayName: true,
  typePropName: "type",
} satisfies RegisteredDocgenLoaderOptions["generateOptions"];

const registeredOptions = new Map<string, RegisteredDocgenLoaderOptions>();
const parserProgramStates = new Map<string, ParserProgramState>();
let nextConfigId = 0;

function getRegisteredCacheKey(configId: string): string {
  return `registered:${configId}`;
}

export function registerDocgenLoaderOptions(
  options: RegisteredDocgenLoaderOptions
): string {
  const configId = String((nextConfigId += 1));
  registeredOptions.set(configId, options);

  return configId;
}

export function clearDocgenLoaderCache(configId: string): void {
  parserProgramStates.delete(getRegisteredCacheKey(configId));
}

function resolveLoaderOptions(
  options: DocgenLoaderOptions
): ResolvedDocgenLoaderOptions {
  if (options.configId) {
    const registered = registeredOptions.get(options.configId);

    if (!registered) {
      throw new Error(
        `Missing react-docgen-typescript-plugin loader options for id ${options.configId}.`
      );
    }

    return {
      cacheKey: getRegisteredCacheKey(options.configId),
      options: registered,
    };
  }

  const {
    compilerOptions,
    docgenOptions,
    fileNames,
    generateOptions,
    docgenCollectionName,
    setDisplayName,
    typePropName,
    ...topLevelDocgenOptions
  } = options;

  return {
    options: {
      compilerOptions: compilerOptions || {},
      docgenOptions: {
        shouldIncludeExpression: true,
        ...topLevelDocgenOptions,
        ...docgenOptions,
      },
      ...(fileNames ? { fileNames } : {}),
      generateOptions: {
        ...defaultGenerateOptions,
        ...generateOptions,
        docgenCollectionName:
          docgenCollectionName === undefined
            ? generateOptions?.docgenCollectionName ??
              defaultGenerateOptions.docgenCollectionName
            : docgenCollectionName,
        setDisplayName:
          setDisplayName ?? generateOptions?.setDisplayName ??
          defaultGenerateOptions.setDisplayName,
        typePropName:
          typePropName ?? generateOptions?.typePropName ??
          defaultGenerateOptions.typePropName,
      },
    },
  };
}

function normalizeRootName(fileName: string): string {
  return path.normalize(fileName);
}

function createProgramRootNames(
  fileNames: readonly string[] | undefined,
  resourcePaths: Iterable<string>
): string[] {
  const rootNamesByKey = new Map<string, string>();

  for (const fileName of fileNames || []) {
    rootNamesByKey.set(normalizeRootName(fileName), fileName);
  }

  for (const resourcePath of resourcePaths) {
    rootNamesByKey.set(normalizeRootName(resourcePath), resourcePath);
  }

  return [...rootNamesByKey.values()];
}

function createProgramRootNamesKey(rootNames: readonly string[]): string {
  return rootNames.map(normalizeRootName).sort().join("\0");
}

function getCachedParserProgram(
  cacheKey: string,
  options: RegisteredDocgenLoaderOptions,
  resourcePath: string
): { parser: docGen.FileParser; program: ts.Program } {
  let state = parserProgramStates.get(cacheKey);

  if (!state) {
    state = {
      parser: docGen.withCompilerOptions(
        options.compilerOptions,
        options.docgenOptions
      ),
      resourcePaths: new Set<string>(),
    };
    parserProgramStates.set(cacheKey, state);
  }

  state.resourcePaths.add(resourcePath);

  const rootNames = createProgramRootNames(
    options.fileNames,
    state.resourcePaths
  );
  const rootNamesKey = createProgramRootNamesKey(rootNames);

  if (!state.program || state.programRootNamesKey !== rootNamesKey) {
    state.program = ts.createProgram(
      rootNames,
      options.compilerOptions,
      undefined,
      state.program
    );
    state.programRootNamesKey = rootNamesKey;
  }

  return { parser: state.parser, program: state.program };
}

function createParserProgram(
  options: RegisteredDocgenLoaderOptions,
  resourcePath: string
): { parser: docGen.FileParser; program: ts.Program } {
  const rootNames = createProgramRootNames(options.fileNames, [resourcePath]);

  return {
    parser: docGen.withCompilerOptions(
      options.compilerOptions,
      options.docgenOptions
    ),
    program: ts.createProgram(rootNames, options.compilerOptions),
  };
}

export default function loader(
  this: LoaderContext<DocgenLoaderOptions>,
  source: string
): void {
  const callback = this.async();

  try {
    const { cacheKey, options } = resolveLoaderOptions(this.getOptions());
    const { generateOptions } = options;
    const { parser, program } = cacheKey
      ? getCachedParserProgram(cacheKey, options, this.resourcePath)
      : createParserProgram(options, this.resourcePath);
    const componentDocs = parser.parseWithProgramProvider(
      this.resourcePath,
      () => program
    );

    if (!componentDocs.length) {
      callback(null, source);
      return;
    }

    callback(
      null,
      generateDocgenCodeBlock({
        filename: this.resourcePath,
        source,
        componentDocs,
        ...generateOptions,
      })
    );
  } catch (error) {
    callback(error instanceof Error ? error : new Error(String(error)));
  }
}
