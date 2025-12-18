number mix = ((number x, number y) => x > y ? x - y : y - x)(2, 5);
number compose = ((number x) => ((number y) => y * 2)(x + 1))(3);
boolean cond = ((number x) => (x > 0 ? true : false) && (x == 1 ? true : false))(1);
