import { Token , TokenType , Tokenizer } from './tokenizer.js';

export class Parser{
    private tokens: Token[];
    private position: number = 0;
    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }
    public parse(): RootNode {
        const rootNode: RootNode = {
            type: 'Root',
            children: []
        };
        while(this.position < this.tokens.length) {
            const currentToken = this.tokens[this.position];
            if(currentToken.type == TokenType.Equals){
                const lhs = this.parseAssign(this.tokens.slice(Tokenizer.lastSeperator(this.tokens, this.position -1) +1, this.position));
                const rhs = this.parseExpression(this.tokens.slice(this.position +1, Tokenizer.nextSeperator(this.tokens, this.position + 1)));
                const assignmentNode: AssignmentNode = {
                    type: 'Assignment',
                    lhs: lhs,
                    rhs: rhs
                };
                rootNode.children.push(assignmentNode);
                this.position = Tokenizer.nextSeperator(this.tokens, this.position + 1) +1;
            }
            this.position++;
        }
        return rootNode;
    }

    public static checkTypes(node: RootNode){
        for(let child of node.children){
            if(child.type === 'Assignment'){
                if((child as AssignmentNode).lhs.type == 'VariableDecNode'){
                    if(Parser.getType((child as AssignmentNode).rhs) != (child as any).lhs.varType){
                        throw new Error(`Type mismatch in assignment: cannot assign ${Parser.getType((child as AssignmentNode).rhs)} to ${ (child as any).lhs.varType}`);
                    }
                }
            }
        }
    }

    public static getType(node: Node,variables:VariableDecNode[] = []): string {
        switch(node.type){
            case 'Literal':
                const literalNode = node as LiteralNode;
                if(typeof literalNode.value === 'number'){
                    return 'number';
                }
                else if(typeof literalNode.value === 'string'){
                    return 'string';
                }
                else if(typeof literalNode.value === 'boolean'){
                    return 'boolean';
                }
                break;
            case 'InlineFunction':
                const funcNode = node as InlineFunctionNode;
                return `(${funcNode.inputTypes.join(',')}) => ${funcNode.returnType}`;
            case 'Identifier':
                const identifierNode = node as IdentifierNode;
                for(let variable of variables){
                    if(variable.value === identifierNode.value){
                        return variable.varType;
                    }
                }
                throw new Error(`Undefined identifier: ${identifierNode.value}`);
            case 'FunctionCall':
                const call = node as FunctionCallNode;
                const calleeType = this.getType(call.func, variables);
                const match = /^\((.*)\)\s*=>\s*(.+)$/.exec(calleeType);
                if(!match){
                    throw new Error(`Cannot call non-function type ${calleeType}`);
                }
                const paramTypes = match[1].trim().length ? match[1].split(',') : [];
                const returnType = match[2];
                if(call.arguments.length !== paramTypes.length){
                    throw new Error(`Argument count mismatch: expected ${paramTypes.length}, got ${call.arguments.length}`);
                }
                call.arguments.forEach((arg, i) => {
                    const argType = this.getType(arg, variables);
                    if(argType !== paramTypes[i]){
                        throw new Error(`Argument ${i+1} type mismatch: expected ${paramTypes[i]}, got ${argType}`);
                    }
                });
                return returnType;
            case 'BinaryExpression':
                const binaryNode = node as BinaryExpressionNode;
                const leftType = this.getType(binaryNode.left, variables);
                const rightType = this.getType(binaryNode.right, variables);
                if(binaryNode.operator == '>' || binaryNode.operator == '<' || binaryNode.operator == '>=' || binaryNode.operator == '<='){
                    if(leftType === 'number' && rightType === 'number'){
                        return 'boolean';
                    }
                    else{
                        throw new Error(`Type mismatch in binary expression: ${leftType} ${binaryNode.operator} ${rightType}`);
                    }
                }
                if(leftType === rightType){
                    return leftType;
                }
                else{
                    throw new Error(`Type mismatch in binary expression: ${leftType} ${binaryNode.operator} ${rightType}`);
                }
            case 'UnaryExpression':
                const unaryNode = node as UnaryExpressionNode;
                return this.getType(unaryNode.argument, variables);
            case 'TernaryExpression':
                const ternaryNode = node as TernaryNode;
                const condType = this.getType(ternaryNode.condition, variables);
                const trueType = this.getType(ternaryNode.trueExpr, variables);
                const falseType = this.getType(ternaryNode.falseExpr, variables);
                if(condType !== 'boolean'){
                    throw new Error(`Condition of ternary expression must be boolean, got ${condType}`);
                }
                if(trueType === falseType){
                    return trueType;
                }
                else{
                    throw new Error(`Type mismatch in ternary expression: ${trueType} ? ${falseType}`);
                }
            case 'VariableDecNode':
                throw new Error('Cannot assign to variable decleration')
        }
        throw new Error('Unknown node type: ' + node.type);
    }

    public static print(node: RootNode | Node, indent: string = ''): void {
        console.log(indent + node.type);
        const newIndent = indent + '  ';
        switch (node.type) {
            case 'Root':
                (node as RootNode).children.forEach(child => this.print(child, newIndent));
                break;
            case 'Assignment':
                this.print((node as AssignmentNode).lhs, newIndent);
                this.print((node as AssignmentNode).rhs, newIndent);
                break;
            case 'TernaryExpression':
                this.print((node as TernaryNode).condition, newIndent);
                this.print((node as TernaryNode).trueExpr, newIndent);
                this.print((node as TernaryNode).falseExpr, newIndent);
                break;
            case 'InlineFunction':
                (node as InlineFunctionNode).parameters.forEach(param => this.print(param, newIndent));
                this.print((node as InlineFunctionNode).body, newIndent);
                break;
            case 'FunctionCall':
                this.print((node as FunctionCallNode).func, newIndent);
                (node as FunctionCallNode).arguments.forEach(arg => this.print(arg, newIndent));
                break;
            case 'BinaryExpression':
                this.print((node as BinaryExpressionNode).left, newIndent); 
                this.print((node as BinaryExpressionNode).right, newIndent);
                break;
            case 'UnaryExpression':
                this.print((node as UnaryExpressionNode).argument, newIndent);
                break;
            case 'VariableDecNode':
            case 'Identifier':
            case 'Literal':
                // Identifiers and Literals have no children
                break;
            default:
                throw new Error('Unknown node type: ' + (node as any).type);
        }
    }

    private parseAssign(tokens: Token[]): Node {
        let [type,name] = Tokenizer.expect(...tokens).toBe(TokenType.Identifier,TokenType.Identifier).get(); 
        return {
            type:'VariableDecNode',
            varType: type.value,
            value: name.value
        } as VariableDecNode;

    }

    private parseExpression(tokens: Token[]): Node{
        let pos = 0;
        while(pos < tokens.length) {
            let currentToken = tokens[pos];
            if(currentToken.type == TokenType.QuestionMark){
                const condition = this.parseExpression(tokens.slice(0, pos));
                const trueTokens = tokens.slice(pos +1, Tokenizer.next(tokens,pos+1,TokenType.Colon,TokenType.QuestionMark,TokenType.Colon));
                if(trueTokens[trueTokens.length -1].type == TokenType.Colon){
                    trueTokens.pop();
                }
                console.log('True Tokens: ' + Tokenizer.toString(trueTokens));
                const falseTokens = tokens.slice(Tokenizer.next(tokens,pos+1,TokenType.Colon,TokenType.QuestionMark,TokenType.Colon));
                if(falseTokens[0].type == TokenType.Colon){
                    falseTokens.shift();
                }
                console.log('False Tokens: ' + Tokenizer.toString(falseTokens));
                const trueExpr = this.parseExpression(trueTokens);
                const falseExpr = this.parseExpression(falseTokens);
                return {
                    type: 'TernaryExpression',
                    condition: condition,
                    trueExpr: trueExpr,
                    falseExpr: falseExpr
                } as TernaryNode;
            }
            if(currentToken.type == TokenType.Oparen){
                const closeIndex = this.findMatchingCloseParen(tokens, pos);
                if(closeIndex !== -1 && pos > 0){
                    let func: Node;
                    try{
                        func = this.parseFunction(tokens.slice(0, pos));
                    }catch{
                        // Not a callable callee; continue scanning
                        pos++;
                        continue;
                    }
                    const argsTokens = tokens.slice(pos + 1, closeIndex);
                    const args: Node[] = [];
                    let argStart = 0;
                    let nest = 0;
                    for(let i = 0; i < argsTokens.length; i++) {
                        if(argsTokens[i].type === TokenType.Oparen){
                            nest++;
                        }
                        else if(argsTokens[i].type === TokenType.Cparen){
                            nest--;
                        }
                        else if(argsTokens[i].type == TokenType.Comma && nest === 0){
                            if(i > argStart){
                                args.push(this.parseExpression(argsTokens.slice(argStart, i)));
                            }
                            else{
                                // allow empty segment for safety; skip
                            }
                            argStart = i + 1;
                        }
                    }
                    if(argStart < argsTokens.length) {
                        args.push(this.parseExpression(argsTokens.slice(argStart)));
                    } else if(argsTokens.length === 0){
                        // zero-arg call
                    }
                    return {
                        type: 'FunctionCall',
                        func: func,
                        arguments: args
                    } as FunctionCallNode;
                }
            }
           
            pos++;
        }
        return this.parseExpressionInner(tokens);
    }

    private parseFunction(tokens: Token[]): Node {
        if(tokens.length == 0){
            throw new Error('Cannot parse function from empty token list');
        }
        if(tokens.length == 1 && tokens[0].type == TokenType.Identifier){
            return {
                type: 'Identifier',
                value: tokens[0].value
            } as IdentifierNode;
        }
        Tokenizer.expect(tokens[0]).toBe(TokenType.Oparen);
        Tokenizer.expect(tokens[tokens.length -1]).toBe(TokenType.Cparen);
        let pos = 1;
        while(pos < tokens.length - 1) {
            let currentToken = tokens[pos];
            if(currentToken.type == TokenType.Arrow){
                const paramsTokens = tokens.slice(1, pos);
                const bodyTokens = tokens.slice(pos + 1, tokens.length - 1);
                const parameters = this.parseFunctionParameters(paramsTokens);
                const inputTypes = parameters.map(param => param.varType);
                const returnType = Parser.getType(this.parseExpression(bodyTokens),parameters);
                return {
                    type: 'InlineFunction',
                    parameters: parameters,
                    inputTypes: inputTypes,
                    returnType: returnType,
                    body: this.parseExpression(bodyTokens)
                } as InlineFunctionNode;
            }
            pos++;
        }
        throw new Error('Failed to parse function from tokens: ' + Tokenizer.toString(tokens));
    }
                

    private parseFunctionParameters(tokens: Token[]): VariableDecNode[] {
        const params: VariableDecNode[] = [];
        let pos = 0;
        while(pos < tokens.length) {
            let currentToken = tokens[pos];
            if(currentToken.type == TokenType.Identifier) {
                let varType = currentToken.value;
                pos++;
                if(pos < tokens.length && tokens[pos].type == TokenType.Identifier) {
                    let varName = tokens[pos].value;
                    params.push({
                        type: 'VariableDecNode',
                        varType: varType,
                        value: varName
                    } as VariableDecNode);
                }
            }
            pos++;
        }
        return params;
    }

    private findMatchingCloseParen(tokens: Token[], openIndex: number): number {
        let nest = 0;
        for(let i = openIndex; i < tokens.length; i++){
            if(tokens[i].type === TokenType.Oparen){
                nest++;
            } else if(tokens[i].type === TokenType.Cparen){
                nest--;
                if(nest === 0){
                    return i;
                }
            }
        }
        return -1;
    }

    private parseExpressionInner(tokens: Token[]): Node {
        if(tokens.length == 1) {
            if (tokens[0].type == TokenType.Identifier) {
                return {
                    type: 'Identifier',
                    value: tokens[0].value
                } as IdentifierNode;
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
                    type: 'Literal',
                    value: value
                } as LiteralNode;
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
                    right: rhs
                } as BinaryExpressionNode; 
            }
            else if(currentToken.type == TokenType.UnaryOperator){
                const rhs = this.parseExpression(tokens.slice(pos +1));
                return {
                    type: 'UnaryExpression',
                    operator: currentToken.value,
                    argument: rhs
                } as UnaryExpressionNode; 
            }
            pos++;
        }
        throw new Error('Failed to parse expression from tokens: ' + Tokenizer.toString(tokens));
    }
}

export interface RootNode {
    type: 'Root';
    children: Node[]
}

export interface Node {
    type: string;
}

export interface AssignmentNode extends Node {
    type: 'Assignment';
    lhs: Node;
    rhs: Node;
}

export interface IdentifierNode extends Node {
    type: 'Identifier';
    value: string;
}

export interface LiteralNode extends Node {
    type: 'Literal';
    value: string | number | boolean;
}

export interface BinaryExpressionNode extends Node {
    type: 'BinaryExpression';
    operator: string;
    left: Node;
    right: Node;
}

export interface UnaryExpressionNode extends Node {
    type: 'UnaryExpression';
    operator: string;
    argument: Node;
}   

export interface VariableDecNode extends Node {
    type: 'VariableDecNode';
    varType: string;
    value: string;
}

export interface InlineFunctionNode extends Node {
    type: 'InlineFunction';
    parameters: VariableDecNode[];
    inputTypes: string[];
    returnType: string;
    body: Node;
}

export interface FunctionCallNode extends Node{
    type: 'FunctionCall';
    func: Node;
    arguments: Node[];
}



export interface TernaryNode extends Node {
    type: 'TernaryExpression';
    condition: Node;
    trueExpr: Node;
    falseExpr: Node;
}
