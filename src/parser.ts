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

    public static getType(node: Node): string {
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
            case 'Identifier':
                // In a full implementation, we would look up the identifier in a symbol table
                return 'unknown';
            case 'BinaryExpression':
                const binaryNode = node as BinaryExpressionNode;
                const leftType = this.getType(binaryNode.left);
                const rightType = this.getType(binaryNode.right);
                if(leftType === rightType){
                    return leftType;
                }
                else{
                    throw new Error(`Type mismatch in binary expression: ${leftType} ${binaryNode.operator} ${rightType}`);
                }
            case 'UnaryExpression':
                const unaryNode = node as UnaryExpressionNode;
                return this.getType(unaryNode.argument);
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

    private parseExpression(tokens: Token[]): Node {
        if(tokens.length == 1) {
            if (tokens[0].type == TokenType.Identifier) {
                return {
                    type: 'Identifier',
                    value: tokens[0].value
                } as IdentifierNode;
            }
            else if (tokens[0].type == TokenType.Number || tokens[0].type == TokenType.String || tokens[0].type == TokenType.Boolean) {
                return {
                    type: 'Literal',
                    value: tokens[0].value
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


export type AstNode =
    | RootNode
    | AssignmentNode
    | IdentifierNode
    | LiteralNode
    | BinaryExpressionNode
    | UnaryExpressionNode
    | VariableDecNode;