// rewrite of the original calculator.js, where everything is pretty much the same but stored inside of a class.
// nothing special about this one really, same logic and all

//cleans up an array and removes indices with empty values
Array.prototype.clean = function () {
    for (let i = 0; i < this.length; ++i) {
        if (this[i] === "") {
            this.splice(i, 1);
        }
    }
    return this;
}

const h = require('./helper');

class Calculator {

    //mathematical constants for the calculator
    e = Math.E;
    pi = Math.PI;
    helper = new h();

    constructor() {}

    //converts an expression to a Reverse Polish Notation (RPN) format so a calculator can better compute the math problem
    //allows for the calculator function to solve more complex mathematical formulas when entered
    //implementation of Djikstra's Shunting Yard algorithm
    //@param   infixEq   The equation to be converted in infix (standard) form
    //return             The equation now in reverse polish notation
    #convertToRPN(infixEq) {
        let output = "";
        let operStack = [];

        let lastCharChecked = '';
        let isNegative = false;

        //our list of operators that we will be dealing with
        //may add the special operators 'x' and ':' that were mentioned by a viewer
        let operators = {
            "^": {
                precedence: 4,
                associativity: "Right"
            },
            "/": {
                precedence: 3,
                associativity: "Left"
            },
            "*": {
                precedence: 3,
                associativity: "Left"
            },
            "%": {
                precedence: 3,
                associativity: "Left"
            },
            "!": {
                precedence: 3,
                associativity: "Left"
            },
            "+": {
                precedence: 2,
                associativity: "Left"
            },
            "-": {
                precedence: 2,
                associativity: "Left"
            }
        };

        //remove all white space present and tokenize the equation
        infixEq = infixEq.replace(/\s+/g, "");
        infixEq = infixEq.split(/([\+\-\!\*\/\^\%\(\)])/).clean();

        //go through the whole eq array and compute from there
        for (let i = 0; i < infixEq.length; ++i) {
            let token = infixEq[i];
            if (this.helper.isNumeric(token)) {

                if (isNegative) {//if we detected a unary negation before hand, we make the number negative before we output it
                    token *= -1;
                    isNegative = false;
                }

                output += token + " ";

            } else if ("^*/%!+-".indexOf(token) != -1) {//the token is an operator we are looking for

                //first, we see if the operator is a '-' and check for negations for it
                if (token == '-' && (lastCharChecked == '' || "^*/%!+-".indexOf(lastCharChecked) != -1 || lastCharChecked == '(')) {
                    //check now to see if the last character checked was an operator or if this character is the first in the eq
                    isNegative = true;
                } else {//no negations, so just go to the next part
                    let o1 = token;
                    let o2 = operStack[operStack.length - 1];

                    while ("^*/%!+-".indexOf(o2) != -1 && ((operators[o1].associativity == "Left" &&
                        operators[o1].precedence <= operators[o2].precedence) || (operators[o1].associativity == "Right" &&
                            operators[o1].precedence < operators[o2].precedence))) {
                        output += operStack.pop() + " ";
                        o2 = operStack[operStack.length - 1];
                    }

                    operStack.push(o1);
                }

            } else if (token == "(") {

                operStack.push(token);

            } else if (token == ")") {

                while (operStack[operStack.length - 1] != "(") {
                    output += operStack.pop() + " ";
                }
                operStack.pop();

            } else if (token.toLowerCase() == "e") {//this condition and the one below it are for recognizing math constants; so far, e and pi
                output += e.toString() + " ";
            } else if (token.toLowerCase() == "pi" || token == "?") {
                output += pi.toString() + " ";
            } 
            lastCharChecked = token;
        }
        while (operStack.length > 0) {
            output += operStack.pop() + " ";
        }
        return output;
    }

    //calculates a problem using RPN function defined above
    //can handle multiple different sized math problems
    //operators possible: =, -, *, /, %, :, x, ^, !
    //@param   mathProblem   An equation to be solved in reverse polish notation
    //@return                The end product of the solved equation
    calculate(mathProblem) {

        mathProblem = this.#convertToRPN(mathProblem);

        let resultStack = []
        mathProblem = mathProblem.split(" ");

        for (let i = 0; i < mathProblem.length; ++i) {
            if (this.helper.isNumeric(mathProblem[i])) {

                resultStack.push(parseFloat(mathProblem[i]));

            } else if (this.helper.isOperator(mathProblem[i])) {
                let a = resultStack.pop();
                let b;
                if (resultStack.length != 0) {
                    b = resultStack.pop();
                } else {
                    b = 0;
                }
                let oper = mathProblem[i];

                switch (oper) {
                    case '+':
                        resultStack.push(b + a);
                        break;
                    case '-':
                        resultStack.push(b - a);
                        break;
                    case 'x':
                    case '*':
                        resultStack.push(b * a);
                        break;
                    case '!':
                        resultStack.push(this.#factorial(a));
                        break;
                    case ':':
                    case '/':
                        if (a == 0) {
                            return `Error: Cannot divide by zero.`;
                        }
                        resultStack.push(b / a);
                        break;
                    case '%':
                        resultStack.push(b % a);
                        break;
                    case '^':
                        resultStack.push(Math.pow(b, a));
                        break;
                }
            }
        }

        if (resultStack.length > 1) {
            return `Error: Not enough operators present or not enough numbers`;
        } else {
            return resultStack.pop();
        }
    }

    //Calculates a factorial to the number given
    //@param   cycleNum   The number that we need to calculate the factorial of
    //@result             The product of the factorial
    #factorial(cycleNum) {
        let answer = 1;
        for (let i = 2; i < cycleNum + 1; ++i) {
            answer *= i;
        }
        return answer;
    }


}

module.exports = Calculator;
