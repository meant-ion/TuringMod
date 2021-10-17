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
    //@param   infix_eq   The equation to be converted in infix (standard) form
    //return             The equation now in reverse polish notation
    #convertToRPN(infix_eq) {
        let output = "";
        let oper_stack = [];

        let last_char_checked = '';
        let is_negative = false;

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
        infix_eq = infix_eq.replace(/\s+/g, "");
        infix_eq = infix_eq.split(/([\+\-\!\*\/\^\%\(\)])/).clean();

        //go through the whole eq array and compute from there
        for (let i = 0; i < infix_eq.length; ++i) {
            let token = infix_eq[i];
            if (this.helper.isNumeric(token)) {

                if (is_negative) {//if we detected a unary negation before hand, we make the number negative before we output it
                    token *= -1;
                    is_negative = false;
                }

                output += token + " ";

            } else if ("^*/%!+-".indexOf(token) != -1) {//the token is an operator we are looking for

                //first, we see if the operator is a '-' and check for negations for it
                if (token == '-' && (last_char_checked == '' || "^*/%!+-".indexOf(last_char_checked) != -1 || last_char_checked == '(')) {
                    //check now to see if the last character checked was an operator or if this character is the first in the eq
                    is_negative = true;
                } else {//no negations, so just go to the next part
                    let o1 = token;
                    let o2 = oper_stack[oper_stack.length - 1];

                    while ("^*/%!+-".indexOf(o2) != -1 && ((operators[o1].associativity == "Left" &&
                        operators[o1].precedence <= operators[o2].precedence) || (operators[o1].associativity == "Right" &&
                            operators[o1].precedence < operators[o2].precedence))) {
                        output += oper_stack.pop() + " ";
                        o2 = oper_stack[oper_stack.length - 1];
                    }

                    oper_stack.push(o1);
                }

            } else if (token == "(") {

                oper_stack.push(token);

            } else if (token == ")") {

                while (oper_stack[oper_stack.length - 1] != "(") {
                    output += oper_stack.pop() + " ";
                }
                oper_stack.pop();

            } else if (token.toLowerCase() == "e") {//this condition and the one below it are for recognizing math constants; so far, e and pi
                output += e.toString() + " ";
            } else if (token.toLowerCase() == "pi" || token == "?") {
                output += pi.toString() + " ";
            } 
            last_char_checked = token;
        }
        while (oper_stack.length > 0) {
            output += oper_stack.pop() + " ";
        }
        return output;
    }

    //calculates a problem using RPN function defined above
    //can handle multiple different sized math problems
    //operators possible: =, -, *, /, %, :, x, ^, !
    //@param   math_problem   An equation to be solved in reverse polish notation
    //@return                The end product of the solved equation
    calculate(math_problem) {

        math_problem = this.#convertToRPN(math_problem);

        let result_stack = []
        math_problem = math_problem.split(" ");

        for (let i = 0; i < math_problem.length; ++i) {
            if (this.helper.isNumeric(math_problem[i])) {

                result_stack.push(parseFloat(math_problem[i]));

            } else if (this.helper.isOperator(math_problem[i])) {
                let a = result_stack.pop();
                let b;
                if (result_stack.length != 0) {
                    b = result_stack.pop();
                } else {
                    b = 0;
                }
                let oper = math_problem[i];

                switch (oper) {
                    case '+':
                        result_stack.push(b + a);
                        break;
                    case '-':
                        result_stack.push(b - a);
                        break;
                    case 'x':
                    case '*':
                        result_stack.push(b * a);
                        break;
                    case '!':
                        result_stack.push(this.#factorial(a));
                        break;
                    case ':':
                    case '/':
                        if (a == 0) {
                            return `Error: Cannot divide by zero.`;
                        }
                        result_stack.push(b / a);
                        break;
                    case '%':
                        result_stack.push(b % a);
                        break;
                    case '^':
                        result_stack.push(Math.pow(b, a));
                        break;
                }
            }
        }

        if (result_stack.length > 1) {
            return `Error: Not enough operators present or not enough numbers`;
        } else {
            return result_stack.pop();
        }
    }

    //Calculates a factorial to the number given
    //@param   cycle_num   The number that we need to calculate the factorial of
    //@result             The product of the factorial
    #factorial(cycle_num) {
        let answer = 1;
        for (let i = 2; i < cycle_num + 1; ++i) {
            answer *= i;
        }
        return answer;
    }


}

module.exports = Calculator;
