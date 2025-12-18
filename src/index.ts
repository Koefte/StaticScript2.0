import * as fs from 'fs';
import * as path from 'path';
import { Tokenizer , TokenType} from './tokenizer.js';
import { Parser } from './parser.js';
import { Scope } from './scope.js';

const inputArg = process.argv[2];
if (!inputArg) {
	throw new Error('Please provide a file path or directory containing .jss files');
}

const targetPath = path.resolve(process.cwd(), inputArg);

function runFile(filePath: string){
	const inputCode = fs.readFileSync(filePath, 'utf-8');
	const tokenizer = new Tokenizer(inputCode);
	const tokens = tokenizer.tokenize();
	const scope = new Scope(tokens);
	const parser = new Parser();
	const test = parser.parseExpression(tokens);
	Parser.print(test);
	console.log(`\n=== ${path.relative(process.cwd(), filePath)} ===`);
	//Parser.checkTypes(ast);
}

const stats = fs.statSync(targetPath);
if(stats.isDirectory()){
	const entries = fs.readdirSync(targetPath)
		.filter(name => name.endsWith('.jss'))
		.map(name => path.join(targetPath, name))
		.sort();
	if(entries.length === 0){
		console.log('No .jss files found in directory');
	}
    for(const entry of entries){
        try {
            runFile(entry);
        } catch (error) {
            console.error(`Error processing file ${path.relative(process.cwd(), entry)}: ${(error as Error).message}`);
            process.exitCode = 1;
            process.abort();
        }
    }
} else {
	runFile(targetPath);
}