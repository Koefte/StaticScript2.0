import { Token, TokenType , Tokenizer } from "./tokenizer.js";

export class Scope{
  tokens:Token[] = []
  //variables: Variable[] = []
  children:Scope[] = []
  parent:Scope | undefined = undefined 


  constructor(inputTokens:Token[]){
    for(let i = 0;i<inputTokens.length;i++){
      let token = inputTokens[i]
      if(token.type == TokenType.Obrace && inputTokens[i-1].type != TokenType.Equals){ // TODO: fix for standalone nesting
        let matchingCBraceIdx = Tokenizer.findMatchingCBrace(inputTokens,i)
        let childScope = new Scope(inputTokens.slice(i+1, matchingCBraceIdx))
        this.children.push(childScope)
        childScope.parent = this
        i = matchingCBraceIdx == - 1 ? i : matchingCBraceIdx
      }
      else this.tokens.push(token)
    }
    //this.variables = analyzeVariables(this.tokens)
  }

  
  

  

  /*getAllVariables():Variable[]{
      if(this.parent == undefined) return this.variables
      return join(this.variables,this.parent.getAllVariables())
  }*/
}