import * as fs from 'fs';
import {Tokenizer} from './tokenizer.js';
import { Parser } from './parser.js';

const inputFilePath =process.argv[2];
const inputCode = fs.readFileSync(process.cwd().toString() + '/'+ inputFilePath, 'utf-8');
const tokenizer = new Tokenizer(inputCode);
const tokens = tokenizer.tokenize();
const parser = new Parser(tokens);
console.log(Tokenizer.toString(tokens))
const ast = parser.parse();
Parser.print(ast);
Parser.checkTypes(ast);