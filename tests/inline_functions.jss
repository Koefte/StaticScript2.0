number double = ((number x) => x * 2)(3);
string greet = ((string name) => "hi" + name)("bob");
boolean greater = ((number a, number b) => a > b)(5, 3);
number nestedReturn = ((number a) => ((number b) => a + b)(2))(3);
