import { RootNode } from "./parser";

export enum TokenType {
    Identifier,
    Number,
    String,
    Boolean,
    Whitespace,
    Oparen,
    Cparen,
    Obrace,
    Cbrace,
    Comma,
    Semicolon,
    QuestionMark,
    Colon,
    BinaryOperator,
    UnaryOperator,
    Equals,
    EOF
}

export type Token = {
    type: TokenType;
    value: string;
    position: number;
    line: number;
}

class ExpectableTokens {
    private tokens: Token[];
    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }
    public toBe(...expectedTypes: TokenType[]): GettableTokens {
        if (this.tokens.length !== expectedTypes.length) {
            throw new Error(`Expected ${expectedTypes.length} tokens, but got ${this.tokens.length}`);
        }
        for (let i = 0; i < expectedTypes.length; i++) {
            if (this.tokens[i].type !== expectedTypes[i]) {
                throw new Error(`Expected token of type ${TokenType[expectedTypes[i]]} at position ${i}, but got ${TokenType[this.tokens[i].type]}`);
            }
        }
        return new GettableTokens(this.tokens);
    }
}

class GettableTokens {
    private tokens: Token[];
    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }
    public get(): Token[] {
        return this.tokens;
    }
}



export class Tokenizer {
    private input: string;
    private position: number = 0;
    private line: number = 1;
    private tokens: Token[] = [];
    private currentChar: string | null = null;

    constructor(input: string) {
        this.input = input;
        this.currentChar = this.input.charAt(this.position);
    }
    public tokenize(): Token[] {
        while (this.currentChar !== null) {
            if (this.isWhitespace(this.currentChar)) {
                this.skipWhitespace();
            }
            else if (this.isLetter(this.currentChar)) {
                this.tokens.push(this.tokenizeIdentifier());
            }
            else if(this.currentChar == '>' || this.currentChar == '<') {
                // Tokenize greater than and less than as binary operators
                const start = this.position;
                const startLine = this.line;
                let value = this.currentChar;
                this.advance();
                let char = this.currentChar;
                if(char == '=' ) {
                    value += this.currentChar;
                    this.advance();
                }
                this.tokens.push({ type: TokenType.BinaryOperator, value, position: start, line: startLine });
            }
            else if(this.currentChar == '=' ) {
                // Tokenize equals as either Equals or BinaryOperator
                const start = this.position;
                const startLine = this.line;
                let value = this.currentChar;
                this.advance();
                let char = this.currentChar;
                if(char == '=' ) {
                    value += this.currentChar;
                    this.advance();
                    this.tokens.push({ type: TokenType.BinaryOperator, value, position: start, line: startLine });
                } else {
                    this.tokens.push({ type: TokenType.Equals, value, position: start, line: startLine });
                }
            }
            else if(this.currentChar == '!' ) {
                // Tokenize not equals as BinaryOperator
                const start = this.position;
                const startLine = this.line;
                let value = this.currentChar;
                this.advance();
                let char = this.currentChar;
                if(char == '=' ) {
                    value += this.currentChar;
                    this.advance();
                    this.tokens.push({ type: TokenType.BinaryOperator, value, position: start, line: startLine });
                } else {
                    this.tokens.push({ type: TokenType.UnaryOperator, value, position: start, line: startLine });
                }
            }
            else if(this.currentChar == '&' || this.currentChar == '|') {
                // Tokenize logical operators as BinaryOperator
                const start = this.position;
                const startLine = this.line;
                let value = this.currentChar;
                this.advance();
                let char = this.currentChar;
                if(char == this.currentChar ) {
                    value += this.currentChar;
                    this.advance();
                    this.tokens.push({ type: TokenType.BinaryOperator, value, position: start, line: startLine });
                } else {
                    this.tokens.push({ type: TokenType.BinaryOperator, value, position: start, line: startLine });
                }
            }
            else if (this.isDigit(this.currentChar)) {
                this.tokens.push(this.tokenizeNumber());
            }
            else if (this.currentChar === '"'|| this.currentChar === "'") {
                this.tokens.push(this.tokenizeString());
            }
            else {
                this.tokens.push(this.tokenizeSymbol());
            }
        }
        this.tokens.push({ type: TokenType.EOF, value: "", position: this.position, line: this.line });
        return this.tokens;
    }

    public static toString(tokens: Token[]): string {
        return tokens.map(token => `Type: ${TokenType[token.type]}, Value: "${token.value}", Position: ${token.position}, Line: ${token.line}`).join('\n');
    }

    public static lastSeperator(tokens: Token[], fromIndex: number): number {
        for(let i = fromIndex; i >=0; i--) {
            if(tokens[i].type === TokenType.Semicolon) {
                return i;
            }
        }
        return -1;
    }


    public static nextSeperator(tokens: Token[], fromIndex: number): number {
        for(let i = fromIndex; i < tokens.length; i++) {
            if(tokens[i].type === TokenType.Semicolon) {
                return i;
            }
        }
        return tokens.length -1;
    }

    public static next(tokens: Token[], fromIndex: number, type: TokenType,nester: TokenType,unnester: TokenType): number {
        let nestLevel = 0;
        for(let i = fromIndex; i < tokens.length; i++) {
            if(tokens[i].type === nester) {
                nestLevel++;
            }
            else if(tokens[i].type === type) {
                if(nestLevel === 0) {
                    return i;
                }
            }
            else if(tokens[i].type === unnester) {
                nestLevel--;
            }
        }
        return tokens.length -1;
    }

    public static expect(...tokens: Token[]) {
        return new ExpectableTokens(tokens);
    }

    private isWhitespace(char: string): boolean {
        return /\s/.test(char);
    }

    private isLetter(char: string): boolean {
        return /[a-zA-Z_]/.test(char);
    }

    private isDigit(char: string): boolean {
        return /[0-9]/.test(char);
    }

    private skipWhitespace(): void {
        while (this.currentChar !== null && this.isWhitespace(this.currentChar)) {
            this.advance();
        }
    }
    private tokenizeIdentifier(): Token {
        const start = this.position;
        const startLine = this.line;
        let value = "";
        while (this.currentChar !== null && (this.isLetter(this.currentChar) || this.isDigit(this.currentChar))) {
            value += this.currentChar;
            this.advance();
        }
        if(value === "true" || value === "false") {
            return { type: TokenType.Boolean, value, position: start, line: startLine };
        }
        return { type: TokenType.Identifier, value, position: start, line: startLine };
    }

    private tokenizeString(): Token {
        const start = this.position;
        const startLine = this.line;
        let value = "";
        const quoteType = this.currentChar;
        this.advance(); // Skip opening quote
        while (this.currentChar !== null && this.currentChar !== quoteType) {
            value += this.currentChar;
            this.advance();
        }
        this.advance(); // Skip closing quote
        return { type: TokenType.String, value, position: start, line: startLine };
    }
    private tokenizeNumber(): Token {
        const start = this.position;
        const startLine = this.line;
        let value = "";
        while (this.currentChar !== null && this.isDigit(this.currentChar)) {
            value += this.currentChar;
            this.advance();
        }
        return { type: TokenType.Number, value, position: start, line: startLine };
    }
    private tokenizeSymbol(): Token {
        const start = this.position;
        const startLine = this.line;
        let value = this.currentChar!;
        let type: TokenType;
        switch (this.currentChar) {
            case '(': type = TokenType.Oparen; break;
            case ')': type = TokenType.Cparen; break;
            case '{': type = TokenType.Obrace; break;
            case '}': type = TokenType.Cbrace; break;
            case ',': type = TokenType.Comma; break;
            case ';': type = TokenType.Semicolon; break;
            case '+':
            case '-':
            case '*':
            case '/':
            case '<':
            case '>':
                type = TokenType.BinaryOperator; break;
            case '!':
            case '~':
                type = TokenType.UnaryOperator; break;
            case '=':
                type = TokenType.Equals; break;
            case '?':
                type = TokenType.QuestionMark; break;
            case ':':
                type = TokenType.Colon; break;
            default:
                throw new Error(`Unknown symbol: ${this.currentChar} at position ${this.position}`);
        }
        this.advance();
        return { type, value, position: start, line: startLine };
    }

    private advance(): void {
        if (this.currentChar === '\n') {
            this.line++;
        }
        this.position++;
        if (this.position >= this.input.length) {
            this.currentChar = null;
        } else {
            this.currentChar = this.input.charAt(this.position);
        }
    }

}