// rewrite of the original calculator.js, where everything is pretty much the same but stored inside of a class.
// nothing special about this one really, same logic and all

//cleans up an array and removes indices with empty values
Array.prototype.clean = function () {
    for (let i = 0; i < this.length; ++i)
        if (this[i] === "") this.splice(i, 1);
    return this;
}

import Helper from './helper.js';

//our list/dictionary of operators/functions that we will be dealing with
//includes arithmetic operators, equality operators, trig functions, and hyperbolic trig
const operators = {
    "^": {
        precedence: 4,
        associativity: "Right"
    },
    //all below and before the 'C' are trig functions
    "sin": {
        precedence: 4,
        associativity: "Right"
    },
    "cos": {
        precedence: 4,
        associativity: "Right"
    },
    "tan": {
        precedence: 4,
        associativity: "Right"
    },
    "sec": {
        precedence: 4,
        associativity: "Right"
    },
    "csc": {
        precedence: 4,
        associativity: "Right"
    },
    "cot": {
        precedence: 4,
        associativity: "Right"
    },
    "sinh": {
        precedence: 4,
        associativity: "Right"
    },
    "cosh": {
        precedence: 4,
        associativity: "Right"
    },
    "tanh": {
        precedence: 4,
        associativity: "Right"
    },
    "sech": {
        precedence: 4,
        associativity: "Right"
    },
    "csch": {
        precedence: 4,
        associativity: "Right"
    },
    "coth": {
        precedence: 4,
        associativity: "Right"
    },
    "C": {//statistical combinations
        precedence: 4, 
        associativity: "Right"
    },
    "P": {//statistical permutations
        precedence: 4,
        associativity: "Right"
    },
    "lcm": {//least common multiple
        precedence: 4,
        associativity: "Right"
    },
    "gcd": {//greatest common denominator
        precedence: 4,
        associativity: "Right"
    },
    "log": {//logarithms
        precedence: 4,
        associativity: "Right"
    },
    "sqrt": {
        precedence: 4,
        associativity: "Right"
    },
    "/": {
        precedence: 3,
        associativity: "Left"
    },
    ":": { //different way to write division apparently
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
    },
    "&": {
        precedence: 1,
        associativity: "Left"
    },
    "xor": {//eXclusive OR
        precedence: 1,
        associativity: "Right"
    },
    "|": {
        precedence: 1,
        associativity: "Left"
    },
    "~": {
        precedence: 1,
        associativity: "Left"
    },
    "<=": {
        precedence: 1,
        associativity: "Right"
    },
    ">=": {
        precedence: 1,
        associativity: "Right"
    },
    "<": {
        precedence: 1,
        associativity: "Right"
    },
    ">": {
        precedence: 1,
        associativity: "Right"
    }
};

export class Calculator {

    //mathematical constants for the calculator
    helper = new Helper();

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
        let eq_oper_found = false;
        
        //remove all white space present and tokenize the equation
        infix_eq = infix_eq.replace(/\s+/g, "");
        infix_eq = infix_eq.split(/([\+\-\&\|\~\<\>\!\*\:\/\^\%\(\)\,\=])/).clean();

        infix_eq = this.helper.replaceCommasWithSpaces(infix_eq);
        //go through the whole eq array and compute from there
        for (let i = 0; i < infix_eq.length; ++i) {
            let token = infix_eq[i];
            if (this.helper.isNumeric(token)) {

                if (is_negative) {//if we detected a unary negation before hand, we make the number negative before we output it
                    token *= -1;
                    is_negative = false;
                }

                output += token + " ";

            } else if (token == '=') {//the token is an = sign, so we need to see if there was a boolean operator before it

                //get the last operator found in eq to avoid "3 > 4 = 1" and similar
                let last_oper_found = oper_stack.pop();
                //if the last char checked was < or > and it was also the most recent operator found
                if ((last_char_checked == '<' || last_char_checked == '>') && 
                    last_oper_found == last_char_checked) {
                        last_oper_found += token;//combine the two into one operator
                        eq_oper_found = true;//just a precaution here
                } else {
                    return "Error: = operator found not coupled with < or >";
                }
                oper_stack.push(last_oper_found);

            } else if (operators[token] != undefined) {//the token is an operator we are looking for

                //first, we see if the operator is a '-' and check for negations for it
                if (token == '-' && (last_char_checked == '' || operators[last_char_checked] != undefined || last_char_checked == '(')) {
                    //check now to see if the last character checked was an operator or if this character is the first in the eq
                    is_negative = true;
                } else {//no negations, so just go to the next part
                    let o1 = token;
                    let o2 = oper_stack[oper_stack.length - 1];

                    if ("<>".indexOf(o1) != -1) eq_oper_found = true;

                    while (operators[o2] != undefined && ((operators[o1].associativity == "Left" &&
                        operators[o1].precedence <= operators[o2].precedence) || (operators[o1].associativity == "Right" &&
                            operators[o1].precedence < operators[o2].precedence))) {
                        output += oper_stack.pop() + " ";
                        o2 = oper_stack[oper_stack.length - 1];
                    }

                    oper_stack.push(o1);
                }

            } else if (token == "(") oper_stack.push(token);
            else if (token == ")") {//we have a closing parenthesis, so we push everything we got in the operator stack to output until we get a '('

                while (oper_stack[oper_stack.length - 1] != "(") output += oper_stack.pop() + " ";
                oper_stack.pop();
              //this condition and the one below it are for recognizing math constants; so far, e and pi
            } else if (token.toLowerCase() == "e") output += Math.E.toString() + " ";
            else if (token == "π" || token == "pi") output += Math.PI.toString() + " ";
            else if (token.toLowerCase() == 'life') output += "42" + " ";
            else return 'Error: unexpected character ' + token;
            last_char_checked = token;
        }
        while (oper_stack.length > 0) output += oper_stack.pop() + " ";

        //we found an equality operator, so we need to make sure that the last char is an equality operator
        //just as a precaution, we will also grab the 
        if (eq_oper_found) {
            let last_real_char = output[output.length - 2];
            if (last_real_char != '<' && last_real_char != '>'
                && last_real_char != '=')
                    return 'Error: illegal combination of equality and arithmetic operators';
                
        }
        return output;
    }

    //calculates a problem using RPN function defined above
    //can handle multiple different sized math problems
    //operators possible: =, -, *, /, %, :, ^, !, <, >, <=, >=, |, &
    //functions possible (treated as operators in execution): 
    //                    sin(), cos(), tan(), sec(), csc(), cot(), sinh(), cosh(), tanh(), csch(), sech(), coth(),
    //                    lcm(), gcm(), sqrt(), xor() (technically an operator, but using ^ for exponents)
    //statistical functions possible: combinations, permutations
    //other functions: logarithms
    //@param   math_problem   An equation to be solved in reverse polish notation
    //@return                 The end product of the solved equation
    calculate(math_problem) {

        //flag for telling if we have an equality operator present. If its there, return type changes from numeric to Boolean
        let is_eq_oper_present = false;

        math_problem = this.#convertToRPN(math_problem);

        // if we have an issue converting the problem to RPN, return the error and go from there
        if (math_problem.substring(0,6) == 'Error:') return math_problem;

        //get the stack to handle the result set up and split the problem into tokens
        let result_stack = [];
        math_problem = math_problem.split(" ");

        for (let i = 0; i < math_problem.length; ++i) {
            //just a number, so push to result stack until we have an operator
            if (this.helper.isNumeric(math_problem[i])) {
                //console.log(math_problem[i].indexOf('.'));
                if (math_problem[i].indexOf('.') != -1) {
                    result_stack.push(parseFloat(math_problem[i]));
                } else result_stack.push(parseInt(math_problem[i]));
            } else if (operators[math_problem[i]] != undefined) {//this is an operator, so now we can start to simplify what we have in the stack
                let a = result_stack.pop();
                let b;
                let no_b_in_stack = false;
                //error handling in case there's an operator before two numbers get put in
                if (result_stack.length != 0) b = result_stack.pop();
                else {
                    b = 0;
                    no_b_in_stack = true;//if there was no 'b' in the stack, we will not push it back on
                }
                let oper = math_problem[i];

                //with operator in hand, set up switch/case and make correct calculation based on operator present
                switch (oper) {
                    case '+':
                        result_stack.push(b + a);
                        break;
                    case '-':
                        result_stack.push(b - a);
                        break;
                    case '*':
                        result_stack.push(b * a);
                        break;
                    case '!':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(this.#factorial(a));
                        break;
                    case ':':
                    case '/':
                        if (a == 0) return `Error: Cannot divide by zero.`;
                        result_stack.push(b / a);
                        break;
                    case '%':
                        result_stack.push(b % a);
                        break;
                    case '^':
                        result_stack.push(Math.pow(b, a));
                        break;
                    //our special operators. We need to check if the stack has no more operators in it. If so, its an error
                    case '<':
                        is_eq_oper_present = true;
                        result_stack.push(b < a);
                        break;
                    case '>':
                        is_eq_oper_present = true;
                        result_stack.push(b > a);
                        break;
                    case '<=':
                        is_eq_oper_present = true;
                        result_stack.push(b <= a);
                        break;
                    case '>=':
                        is_eq_oper_present = true;
                        result_stack.push(b >= a);
                        break;
                    //our functional operators
                    case 'sin':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(Math.sin(this.#degToRad(a)));
                        break;
                    case 'cos':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(Math.cos(this.#degToRad(a)));
                        break;
                    case 'tan':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(Math.tan(this.#degToRad(a)));
                        break;
                    case 'sec':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(1/Math.cos(this.#degToRad(a)));
                        break;
                    case 'csc':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(1/Math.sin(this.#degToRad(a)));
                        break;
                    case 'cot':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(1/Math.tan(this.#degToRad(a)));
                        break;
                    case 'sinh':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(Math.sinh(this.#degToRad(a)));
                        break;
                    case 'cosh':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(Math.cosh(this.#degToRad(a)));
                        break;
                    case 'tanh':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(Math.tanh(this.#degToRad(a)));
                        break;
                    case 'sech':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(1/Math.cosh(this.#degToRad(a)));
                        break;
                    case 'csch':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(1/Math.sinh(this.#degToRad(a)));
                        break;
                    case 'coth':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(1/Math.tanh(this.#degToRad(a)));
                        break;
                    case 'C':
                        result_stack.push(this.#kcombos(b, a));
                        break;
                    case 'P':
                        result_stack.push(this.#permutations(b, a));
                        break;
                    case 'lcm':
                        result_stack.push(this.#lcm(b, a));
                        break;
                    case 'gcd':
                        result_stack.push(this.#gcd(b, a));
                        break;
                    case 'log':
                        result_stack.push(this.#log(a, b));
                        break;
                    case 'sqrt': 
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(Math.sqrt(a));
                        break;
                    //our bitwise operators
                    case '&':
                        result_stack.push(b & a);
                        break;
                    case 'xor':
                        result_stack.push(b ^ a);
                        break;
                    case '|':
                        result_stack.push(b | a);
                        break;
                    case '~':
                        if (!no_b_in_stack) result_stack.push(b);
                        result_stack.push(~a);
                        break;
                }
                no_b_in_stack = false;
            }
        }

        //check to see if we have just one result left. If anything more than one result is in the result stack, we error it out
        if (result_stack.length > 1) return `Error: Not enough operators present or not enough numbers`;
        else {
            //we had an equality operator, so we make it into a boolean object and return it
            if (is_eq_oper_present) return Boolean(result_stack.pop());
            //no equality operators, so we just return the rounded number
            return this.helper.roundToTwoDecimals(result_stack.pop(), false);
        }
    }

    //Calculates a factorial to the number given
    //@param   cycle_num   The number that we need to calculate the factorial of
    //@result             The product of the factorial
    #factorial(cycle_num) {
        let answer = 1;
        for (let i = 2; i < cycle_num + 1; ++i) answer *= i;
        return answer;
    }

    //calculates a k-combination of all k-element sets with n elements. Heavily reliant on the factorial function
    //formula: n!/(k!(n-k)!)
    //@returns   sum of all unique subsets within the set of k elements
    #kcombos(n, k) { return this.#factorial(n) / (this.#factorial(k) * this.#factorial(n - k)); }

    //calculates the permutation of n distinct objects with r taken at a time per group
    //formula: n!/(n - r)!
    //@returns   sum of all permutations with n distinct objects of r size
    #permutations(n, r) { return this.#factorial(n) / this.#factorial(n - r); }

    //calculates the greatest common denominator/factor for two numbers
    //@returns   the gcd of a and b
    #gcd(a, b) {
        if (a == 0) return b;
        return this.#gcd(b % a, a);
    }

    //calculates the least common multiple of two numbers
    //@returns   the lcm of a and b
    #lcm(a, b) { return (a * b) / this.#gcd(a, b); }

    //for use in the various trig functions for the calculator. Converts a degree value to radians
    //@param   degrees   the value to convert, given as degrees
    //@return            The given value now in radians
    #degToRad(degrees) { return degrees * (Math.PI / 180); }

    //calculates the logarithm of a value n with base b
    //Math.log() is effectively a natural logarithm, so we use the change of base formula/identity to handle that
    //@returns   log_b_(n)
    #log(n, b) { return Math.log(n) / Math.log(b); }

}

export default Calculator;
