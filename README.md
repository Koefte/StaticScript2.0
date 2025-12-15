# Static Script

A TypeScript project template.

## Project Structure

- `src/` - TypeScript source files
- `dist/` - Compiled JavaScript output
- `tsconfig.json` - TypeScript configuration
- `package.json` - Project dependencies and scripts

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This will compile TypeScript and run the output.

### Build

```bash
npm run build
```

Compiles TypeScript files to the `dist` directory.

### Watch Mode

```bash
npm run watch
```

Automatically recompile TypeScript files on changes.

### Running Compiled Code

```bash
npm start
```

Runs the compiled JavaScript from the `dist` directory.

### AST Visualizer

Generate an interactive p5.js visualization of the parsed AST:

```bash
npm run visualize -- <input-file> [output-file]
```

Example:

```bash
npm run visualize -- tests/basic.jss ast-view.html
```

Open the generated HTML file in a browser to explore the tree.
