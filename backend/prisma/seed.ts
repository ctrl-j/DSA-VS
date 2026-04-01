import { Difficulty } from "@prisma/client";
import { prisma } from "../src/db/client";

// ---------------------------------------------------------------------------
// Problem definitions with test cases.
// To add a new problem: add an entry to this array. The seed script handles
// the rest (creates the Problem row + all its TestCase rows).
// ---------------------------------------------------------------------------

const PROBLEMS = [
  {
    title: "Two Sum",
    statement:
      "Given two integers on separate lines, print their sum.",
    difficulty: Difficulty.EASY,
    category: "math",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    testCases: [
      { input: "1\n2\n", expectedOutput: "3", isHidden: false },
      { input: "0\n0\n", expectedOutput: "0", isHidden: false },
      { input: "-5\n10\n", expectedOutput: "5", isHidden: false },
      { input: "100\n200\n", expectedOutput: "300", isHidden: true },
      { input: "999999\n1\n", expectedOutput: "1000000", isHidden: true },
      { input: "-100\n-200\n", expectedOutput: "-300", isHidden: true },
    ],
  },
  {
    title: "Reverse String",
    statement:
      "Given a string on one line, print the string reversed.",
    difficulty: Difficulty.EASY,
    category: "strings",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    testCases: [
      { input: "hello\n", expectedOutput: "olleh", isHidden: false },
      { input: "abcde\n", expectedOutput: "edcba", isHidden: false },
      { input: "a\n", expectedOutput: "a", isHidden: false },
      { input: "racecar\n", expectedOutput: "racecar", isHidden: true },
      { input: "Hello World\n", expectedOutput: "dlroW olleH", isHidden: true },
      { input: "\n", expectedOutput: "", isHidden: true },
    ],
  },
  {
    title: "FizzBuzz",
    statement:
      "Given an integer N, print numbers from 1 to N. For multiples of 3 print 'Fizz', for multiples of 5 print 'Buzz', for multiples of both print 'FizzBuzz'. Each on a new line.",
    difficulty: Difficulty.EASY,
    category: "logic",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    testCases: [
      { input: "5\n", expectedOutput: "1\n2\nFizz\n4\nBuzz", isHidden: false },
      { input: "1\n", expectedOutput: "1", isHidden: false },
      { input: "15\n", expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", isHidden: false },
      { input: "3\n", expectedOutput: "1\n2\nFizz", isHidden: true },
      { input: "30\n", expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizz\n22\n23\nFizz\nBuzz\n26\nFizz\n28\n29\nFizzBuzz", isHidden: true },
    ],
  },
  {
    title: "Palindrome Check",
    statement:
      "Given a string on one line, print 'true' if it is a palindrome (reads the same forwards and backwards), otherwise print 'false'. Ignore case.",
    difficulty: Difficulty.EASY,
    category: "strings",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    testCases: [
      { input: "racecar\n", expectedOutput: "true", isHidden: false },
      { input: "hello\n", expectedOutput: "false", isHidden: false },
      { input: "Madam\n", expectedOutput: "true", isHidden: false },
      { input: "a\n", expectedOutput: "true", isHidden: true },
      { input: "ab\n", expectedOutput: "false", isHidden: true },
      { input: "AbBa\n", expectedOutput: "true", isHidden: true },
    ],
  },
  {
    title: "Max of Array",
    statement:
      "The first line contains an integer N. The next line contains N space-separated integers. Print the maximum value.",
    difficulty: Difficulty.MEDIUM,
    category: "arrays",
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    testCases: [
      { input: "5\n3 1 4 1 5\n", expectedOutput: "5", isHidden: false },
      { input: "1\n42\n", expectedOutput: "42", isHidden: false },
      { input: "3\n-1 -2 -3\n", expectedOutput: "-1", isHidden: false },
      { input: "4\n0 0 0 0\n", expectedOutput: "0", isHidden: true },
      { input: "6\n10 20 30 40 50 60\n", expectedOutput: "60", isHidden: true },
      { input: "3\n-1000000 0 1000000\n", expectedOutput: "1000000", isHidden: true },
    ],
  },
  {
    title: "Count Vowels",
    statement:
      "Given a string on one line, print the number of vowels (a, e, i, o, u). Case insensitive.",
    difficulty: Difficulty.EASY,
    category: "strings",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    testCases: [
      { input: "hello\n", expectedOutput: "2", isHidden: false },
      { input: "AEIOU\n", expectedOutput: "5", isHidden: false },
      { input: "xyz\n", expectedOutput: "0", isHidden: false },
      { input: "Programming\n", expectedOutput: "3", isHidden: true },
      { input: "a\n", expectedOutput: "1", isHidden: true },
      { input: "bcdfg\n", expectedOutput: "0", isHidden: true },
    ],
  },
  {
    title: "Fibonacci",
    statement:
      "Given an integer N (0-indexed), print the Nth Fibonacci number. F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2).",
    difficulty: Difficulty.MEDIUM,
    category: "math",
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    testCases: [
      { input: "0\n", expectedOutput: "0", isHidden: false },
      { input: "1\n", expectedOutput: "1", isHidden: false },
      { input: "10\n", expectedOutput: "55", isHidden: false },
      { input: "5\n", expectedOutput: "5", isHidden: true },
      { input: "20\n", expectedOutput: "6765", isHidden: true },
      { input: "30\n", expectedOutput: "832040", isHidden: true },
      { input: "2\n", expectedOutput: "1", isHidden: true },
    ],
  },
  {
    title: "Sort Array",
    statement:
      "The first line contains an integer N. The next line contains N space-separated integers. Print the integers sorted in ascending order, space-separated.",
    difficulty: Difficulty.MEDIUM,
    category: "sorting",
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    testCases: [
      { input: "5\n5 3 1 4 2\n", expectedOutput: "1 2 3 4 5", isHidden: false },
      { input: "1\n7\n", expectedOutput: "7", isHidden: false },
      { input: "4\n4 3 2 1\n", expectedOutput: "1 2 3 4", isHidden: false },
      { input: "3\n-1 -3 -2\n", expectedOutput: "-3 -2 -1", isHidden: true },
      { input: "5\n1 1 1 1 1\n", expectedOutput: "1 1 1 1 1", isHidden: true },
      { input: "6\n100 -50 0 25 -25 50\n", expectedOutput: "-50 -25 0 25 50 100", isHidden: true },
    ],
  },
  {
    title: "Binary Search",
    statement:
      "The first line contains N (size of sorted array) and T (target). The second line contains N space-separated integers in ascending order. Print the 0-based index of T, or -1 if not found.",
    difficulty: Difficulty.MEDIUM,
    category: "searching",
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    testCases: [
      { input: "5 3\n1 2 3 4 5\n", expectedOutput: "2", isHidden: false },
      { input: "5 6\n1 2 3 4 5\n", expectedOutput: "-1", isHidden: false },
      { input: "1 1\n1\n", expectedOutput: "0", isHidden: false },
      { input: "4 4\n1 2 3 4\n", expectedOutput: "3", isHidden: true },
      { input: "3 0\n1 2 3\n", expectedOutput: "-1", isHidden: true },
      { input: "6 10\n2 4 6 8 10 12\n", expectedOutput: "4", isHidden: true },
    ],
  },
  {
    title: "Valid Parentheses",
    statement:
      "Given a string containing only '(', ')', '{', '}', '[', ']', print 'true' if the brackets are valid (every open bracket is closed in the correct order), otherwise 'false'.",
    difficulty: Difficulty.HARD,
    category: "stacks",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    testCases: [
      { input: "()\n", expectedOutput: "true", isHidden: false },
      { input: "()[]{}\n", expectedOutput: "true", isHidden: false },
      { input: "(]\n", expectedOutput: "false", isHidden: false },
      { input: "([)]\n", expectedOutput: "false", isHidden: true },
      { input: "{[]}\n", expectedOutput: "true", isHidden: true },
      { input: "\n", expectedOutput: "true", isHidden: true },
      { input: "(((\n", expectedOutput: "false", isHidden: true },
      { input: "({[]})\n", expectedOutput: "true", isHidden: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed script
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding problems and test cases...\n");

  for (const problem of PROBLEMS) {
    const { testCases, ...problemData } = problem;

    const created = await prisma.problem.create({
      data: {
        ...problemData,
        testCases: {
          create: testCases,
        },
      },
      include: { testCases: true },
    });

    console.log(
      `  ✓ ${created.title} (${created.difficulty}) — ${created.testCases.length} test cases`
    );
  }

  console.log(`\nDone. Seeded ${PROBLEMS.length} problems.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
