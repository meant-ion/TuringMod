const helper = require('./helper');
//file that will hold the functions necessary to do somewhat complex calculations when typed into twitch chat

//cleans up an array and removes indices with empty values
Array.prototype.clean = function () {
    for (var i = 0; i < this.length; ++i) {
        if (this[i] === "") {
            this.splice(i, 1);
        }
    }
    return this;
}

//mathematical constants for the calculator
const e = Math.E;
const pi = Math.PI;

//converts an expression to a Reverse Polish Notation (RPN) format so a calculator can better compute the math problem
//allows for the calculator function to solve more complex mathematical formulas when entered
function convertToRPN(infixEq) {
    var output = "";
    var operStack = [];

    var lastCharChecked = '';
    var isNegative = false;

    console.log(infixEq);

    //our list of operators that we will be dealing with
    //may add the special operators 'x' and ':' that were mentioned by a viewer
    var operators = {
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
    for (var i = 0; i < infixEq.length; ++i) {
        var token = infixEq[i];

        if (helper.isNumeric(token)) {

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
                var o1 = token;
                var o2 = operStack[operStack.length - 1];

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
function calculate(mathProblem) {

    var resultStack = []
    mathProblem = mathProblem.split(" ");
    console.log(mathProblem);

    for (var i = 0; i < mathProblem.length; ++i) {
        if (helper.isNumeric(mathProblem[i])) {
            resultStack.push(parseFloat(mathProblem[i]));
        } else if (helper.isOperator(mathProblem[i])) {
            var a = resultStack.pop();
            if (resultStack.length != 0) {
                var b = resultStack.pop();
            } else {
                var b = 0;
            }
            var oper = mathProblem[i];

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
                    resultStack.push(factorial(a));
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

function factorial(cycleNum) {
    var answer = 1;

    for (var i = 2; i < cycleNum + 1; ++i) {
        answer *= i;
    }
    return answer;
}


module.exports = {
    calculate: calculate,
    convertToRPN: convertToRPN
};