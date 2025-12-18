import { parse } from 'node:path';
import { Token , TokenType , Tokenizer } from './tokenizer.js';


interface Expression {
    type: string;
}

interface TernaryExpression extends Expression {
    type: 'TernaryExpression';
    condition: Expression;
    trueExpr: Expression;
    falseExpr: Expression;
}

interface BinaryExpression extends Expression {
    type: 'BinaryExpression';
    operator: string;
    left: Expression;
    right: Expression;
}

interface UnaryExpression extends Expression {
    type: 'UnaryExpression';
    operator: string;
    arg: Expression;
}

interface VariableExpression extends Expression {
    type: 'VariableExpression';
    varType: string;
    name: string;
}

interface CallableExpression extends Expression {
    type: 'CallableExpression';
    callee: Expression;
    args: ArgumentExpression;
}

interface ArgumentExpression extends Expression {
    type: 'ArgumentExpression';
    args: Expression[];
}

interface LambdaExpression extends Expression {
    type: 'LambdaExpression';
    args: ArgumentExpression
    body: Expression;
}

interface LiteralExpression extends Expression {
    type: 'LiteralExpression';
    value: string | number | boolean;
}

interface IdentifierExpression extends Expression {
    type: 'IdentifierExpression';
    value: string;
}

export class Parser{

   

    parseExpression(tokens:Token[]): Expression {
        let pos = 0;
        let currentExpr: Expression | null = null;
        while(pos < tokens.length){
            const token = tokens[pos];
            if(token.type == TokenType.Oparen && currentExpr == null){
                const closeIndex = Tokenizer.findMatchingCloseParen(tokens, pos);
                if(closeIndex !== -1){
                    currentExpr = this.parseExpression(tokens.slice(pos + 1, closeIndex));
                }
            }
            else if(token.type == TokenType.Arrow && currentExpr == null){
                const argsTokens = tokens.slice(0, pos);
                const bodyTokens = tokens.slice(pos+1);
                const argExprs = Tokenizer.splitByTopLevelCommas(argsTokens).map(argTokens => this.parseArg(argTokens));
                const lambdaExpression: LambdaExpression = {
                    type: 'LambdaExpression',
                    args: {
                        type: 'ArgumentExpression',
                        args: argExprs
                    },
                    body: this.parseExpression(bodyTokens)
                };
                return lambdaExpression;
                
            }
            else if(token.type == TokenType.Oparen && currentExpr != null){
                const closeIndex = Tokenizer.findMatchingCloseParen(tokens, pos);
                if(closeIndex !== -1){
                    const argsExpr = Tokenizer.splitByTopLevelCommas(tokens.slice(pos + 1, closeIndex)).map(argTokens => this.parseExpression(argTokens));
                    const argsExpression: ArgumentExpression = {
                        type: 'ArgumentExpression',
                        args: argsExpr
                    };
                    currentExpr = {
                        type: 'CallableExpression',
                        callee: currentExpr,
                        args: argsExpression
                    } as CallableExpression;
                }
            }
            pos++;
        }
        if(currentExpr == null){
            return this.parseExpressionTernary(tokens);
        }
        return currentExpr;
    }


    private parseArg(tokens: Token[]): VariableExpression{
        let [typeToken,varToken] = Tokenizer.expect(...tokens).toBe(TokenType.Identifier,TokenType.Identifier).get();
        return {
            type: 'VariableExpression',
            varType: typeToken.value,
            name: varToken.value
        } as VariableExpression;
    }
    
    private parseExpressionTernary(tokens: Token[]): Expression {
        let pos = 0;
        while(pos < tokens.length) {
            let currentToken = tokens[pos];
                if(currentToken.type == TokenType.QuestionMark){
                const condition = this.parseExpression(tokens.slice(0, pos));
                const trueTokens = tokens.slice(pos +1, Tokenizer.next(tokens,pos+1,TokenType.Colon,TokenType.QuestionMark,TokenType.Colon));
                if(trueTokens[trueTokens.length -1].type == TokenType.Colon){
                    trueTokens.pop();
                }
                const falseTokens = tokens.slice(Tokenizer.next(tokens,pos+1,TokenType.Colon,TokenType.QuestionMark,TokenType.Colon));
                if(falseTokens[0].type == TokenType.Colon){
                    falseTokens.shift();
                }
                const trueExpr = this.parseExpression(trueTokens);
                const falseExpr = this.parseExpression(falseTokens);
                return {
                    type: 'TernaryExpression',
                    condition: condition,
                    trueExpr: trueExpr,
                    falseExpr: falseExpr
                } as TernaryExpression;
            }
            pos++;
        }
        return this.parseExpressionOps(tokens);
    }   

    private parseExpressionOps(tokens: Token[]): Expression {
        if(tokens.length == 1 || (tokens.length == 2 && tokens[1].type == TokenType.EOF)) {           
            if (tokens[0].type == TokenType.Identifier) {
                return {
                    type: 'IdentifierExpression',
                    value: tokens[0].value,
                } as IdentifierExpression;
            }
            else if (tokens[0].type == TokenType.Number || tokens[0].type == TokenType.String || tokens[0].type == TokenType.Boolean) {
                let value: string | number | boolean;
                if(tokens[0].type == TokenType.Number) {
                    value = Number(tokens[0].value);
                } else if(tokens[0].type == TokenType.Boolean) {
                    value = tokens[0].value === 'true';
                } else {
                    value = tokens[0].value;
                }
                return {
                    type: 'LiteralExpression',
                    value: value,
                    line: tokens[0].line
                } as LiteralExpression;
            }
        }
        let pos = 0;
        while(pos < tokens.length) {
            let currentToken = tokens[pos];
            if(currentToken.type == TokenType.BinaryOperator){
                const lhs = this.parseExpression(tokens.slice(0, pos));
                const rhs = this.parseExpression(tokens.slice(pos +1));
                return {
                    type: 'BinaryExpression',
                    operator: currentToken.value,
                    left: lhs,
                    right: rhs,
                    line: currentToken.line
                } as BinaryExpression; 
            }
            else if(currentToken.type == TokenType.UnaryOperator){
                const rhs = this.parseExpression(tokens.slice(pos +1));
                return {
                    type: 'UnaryExpression',
                    operator: currentToken.value,
                    arg: rhs,
                } as UnaryExpression; 
            }
            pos++;
        }
        throw new Error('Failed to parse expression from tokens: ' + Tokenizer.toString(tokens));
    }


    public static print(node: Expression , indent: string = ''): void {
        console.log(indent + node.type);
        const newIndent = indent + '  ';
        switch (node.type) {
            case 'TernaryExpression':
                this.print((node as TernaryExpression).condition, newIndent);
                this.print((node as TernaryExpression).trueExpr, newIndent);
                this.print((node as TernaryExpression).falseExpr, newIndent);
                break;
            case 'BinaryExpression':
                console.log(indent + (node as BinaryExpression).operator);
                this.print((node as BinaryExpression).left, newIndent); 
                this.print((node as BinaryExpression).right, newIndent);
                break;
            case 'UnaryExpression':
                this.print((node as UnaryExpression).arg, newIndent);
                break;
            case 'IdentifierExpression':
            case 'LiteralExpression':
                console.log(indent + '  ' + (node as any).value);
                // Identifiers and Literals have no children
                break;
            case 'CallableExpression':
                this.print((node as CallableExpression).callee, newIndent);
                this.print((node as CallableExpression).args, newIndent);
                break;
            case 'ArgumentExpression':
                for(const arg of (node as ArgumentExpression).args){
                    this.print(arg, newIndent);
                }
                break;
            case 'LambdaExpression':
                this.print((node as LambdaExpression).args, newIndent);
                this.print((node as LambdaExpression).body, newIndent);
                break;
            case 'VariableExpression':
                console.log(indent + '  ' + (node as VariableExpression).varType + ' ' + (node as VariableExpression).name);
                break;
            default:
                throw new Error('Unknown node type: ' + (node as any).type);
        }
    }


    

}

