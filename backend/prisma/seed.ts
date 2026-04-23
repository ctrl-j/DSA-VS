import { Difficulty } from "@prisma/client";
import { prisma } from "../src/db/client";

// ---------------------------------------------------------------------------
// LeetCode-style problem definitions with templates, drivers, and test cases.
// ---------------------------------------------------------------------------

const PROBLEMS = [
  // =========================================================================
  // 1. Two Sum
  // =========================================================================
  {
    title: "Two Sum",
    functionName: "twoSum",
    statement: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [3,3], target = 6
Output: [0,1]
\`\`\`

**Constraints:**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
    difficulty: Difficulty.EASY,
    category: "arrays",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    solution: {
      python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        lookup = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in lookup:
                return [lookup[complement], i]
            lookup[num] = i
        return []`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> lookup;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (lookup.count(complement)) {
                return {lookup[complement], i};
            }
            lookup[nums[i]] = i;
        }
        return {};
    }
};`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> lookup = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (lookup.containsKey(complement)) {
                return new int[]{lookup.get(complement), i};
            }
            lookup.put(nums[i], i);
        }
        return new int[]{};
    }
}`,
    },
    templates: {
      python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        pass`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {

    }
};`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {

    }
}`,
    },
    drivers: {
      python: {
        header: `import json, sys
from typing import List, Optional`,
        footer: `sol = Solution()
_data = json.loads(sys.stdin.read())
_result = sol.twoSum(_data[0], _data[1])
_result.sort()
print(json.dumps(_result))`,
      },
      cpp: {
        header: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <stack>
#include <sstream>
using namespace std;`,
        footer: `string trim(const string& s) {
    int i = 0, j = s.size() - 1;
    while (i <= j && isspace(s[i])) i++;
    while (j >= i && isspace(s[j])) j--;
    return s.substr(i, j - i + 1);
}

vector<int> parseIntArray(const string& s) {
    vector<int> result;
    string num;
    for (char c : s) {
        if (c == '-' || isdigit(c)) num += c;
        else if (!num.empty()) { result.push_back(stoi(num)); num.clear(); }
    }
    if (!num.empty()) result.push_back(stoi(num));
    return result;
}

void printIntArray(const vector<int>& arr) {
    cout << "[";
    for (int i = 0; i < (int)arr.size(); i++) {
        if (i > 0) cout << ",";
        cout << arr[i];
    }
    cout << "]" << endl;
}

int main() {
    string line;
    getline(cin, line);
    int depth = 0, arrStart = -1, arrEnd = -1;
    for (int i = 0; i < (int)line.size(); i++) {
        if (line[i] == '[') {
            depth++;
            if (depth == 2) arrStart = i;
        } else if (line[i] == ']') {
            if (depth == 2) arrEnd = i;
            depth--;
        }
    }
    string arrStr = line.substr(arrStart, arrEnd - arrStart + 1);
    vector<int> nums = parseIntArray(arrStr);
    string rest = line.substr(arrEnd + 1);
    string numStr;
    for (char c : rest) {
        if (c == '-' || isdigit(c)) numStr += c;
    }
    int target = 0;
    if (!numStr.empty()) target = stoi(numStr);

    Solution sol;
    vector<int> result = sol.twoSum(nums, target);
    sort(result.begin(), result.end());
    printIntArray(result);
    return 0;
}`,
      },
      java: {
        header: `import java.util.*;
import java.io.*;`,
        footer: `class Main {
    static int[] parseIntArray(String s) {
        s = s.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length() - 1);
        if (s.isEmpty()) return new int[0];
        String[] parts = s.split(",");
        int[] result = new int[parts.length];
        for (int i = 0; i < parts.length; i++) result[i] = Integer.parseInt(parts[i].trim());
        return result;
    }

    static String intArrayToJson(int[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(arr[i]);
        }
        sb.append("]");
        return sb.toString();
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        int depth = 0, arrStart = -1, arrEnd = -1;
        for (int i = 0; i < line.length(); i++) {
            if (line.charAt(i) == '[') {
                depth++;
                if (depth == 2) arrStart = i;
            } else if (line.charAt(i) == ']') {
                if (depth == 2) arrEnd = i;
                depth--;
            }
        }
        String arrStr = line.substring(arrStart, arrEnd + 1);
        int[] nums = parseIntArray(arrStr);
        String rest = line.substring(arrEnd + 1);
        StringBuilder numStr = new StringBuilder();
        for (char c : rest.toCharArray()) {
            if (c == '-' || Character.isDigit(c)) numStr.append(c);
        }
        int target = Integer.parseInt(numStr.toString());

        Solution sol = new Solution();
        int[] result = sol.twoSum(nums, target);
        Arrays.sort(result);
        System.out.println(intArrayToJson(result));
    }
}`,
      },
    },
    testCases: [
      { input: "[[2,7,11,15],9]", expectedOutput: "[0,1]", isHidden: false },
      { input: "[[3,2,4],6]", expectedOutput: "[1,2]", isHidden: false },
      { input: "[[3,3],6]", expectedOutput: "[0,1]", isHidden: false },
      { input: "[[1,5,3,7],8]", expectedOutput: "[1,2]", isHidden: true },
      { input: "[[-1,-2,-3,-4],-7]", expectedOutput: "[2,3]", isHidden: true },
      { input: "[[0,4,3,0],0]", expectedOutput: "[0,3]", isHidden: true },
      { input: "[[1,2,3,4,5,6,7,8,9,10],19]", expectedOutput: "[8,9]", isHidden: true },
    ],
  },

  // =========================================================================
  // 2. Reverse String
  // =========================================================================
  {
    title: "Reverse String",
    functionName: "reverseString",
    statement: `Given a string \`s\`, return the string reversed.

**Example 1:**
\`\`\`
Input: s = "hello"
Output: "olleh"
\`\`\`

**Example 2:**
\`\`\`
Input: s = "Hannah"
Output: "hannaH"
\`\`\`

**Example 3:**
\`\`\`
Input: s = "a"
Output: "a"
\`\`\`

**Constraints:**
- 1 <= s.length <= 10^5
- \`s\` consists of printable ASCII characters.`,
    difficulty: Difficulty.EASY,
    category: "strings",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    solution: {
      python: `class Solution:
    def reverseString(self, s: str) -> str:
        return s[::-1]`,
      cpp: `class Solution {
public:
    string reverseString(string s) {
        reverse(s.begin(), s.end());
        return s;
    }
};`,
      java: `class Solution {
    public String reverseString(String s) {
        return new StringBuilder(s).reverse().toString();
    }
}`,
    },
    templates: {
      python: `class Solution:
    def reverseString(self, s: str) -> str:
        pass`,
      cpp: `class Solution {
public:
    string reverseString(string s) {

    }
};`,
      java: `class Solution {
    public String reverseString(String s) {

    }
}`,
    },
    drivers: {
      python: {
        header: `import json, sys
from typing import List, Optional`,
        footer: `sol = Solution()
_data = json.loads(sys.stdin.read())
_result = sol.reverseString(_data[0])
print(json.dumps(_result))`,
      },
      cpp: {
        header: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <stack>
#include <sstream>
using namespace std;`,
        footer: `string parseString(const string& s) {
    int start = s.find('"');
    int end = s.rfind('"');
    if (start == (int)string::npos || start == end) return "";
    return s.substr(start + 1, end - start - 1);
}

int main() {
    string line;
    getline(cin, line);
    string s = parseString(line);

    Solution sol;
    string result = sol.reverseString(s);
    cout << "\\"" << result << "\\"" << endl;
    return 0;
}`,
      },
      java: {
        header: `import java.util.*;
import java.io.*;`,
        footer: `class Main {
    static String parseJsonString(String s) {
        s = s.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length() - 1);
        s = s.trim();
        if (s.startsWith("\\"") && s.endsWith("\\"")) s = s.substring(1, s.length() - 1);
        return s;
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        String s = parseJsonString(line);

        Solution sol = new Solution();
        String result = sol.reverseString(s);
        System.out.println("\\"" + result + "\\"");
    }
}`,
      },
    },
    testCases: [
      { input: '["hello"]', expectedOutput: '"olleh"', isHidden: false },
      { input: '["Hannah"]', expectedOutput: '"hannaH"', isHidden: false },
      { input: '["a"]', expectedOutput: '"a"', isHidden: false },
      { input: '["abcdef"]', expectedOutput: '"fedcba"', isHidden: true },
      { input: '["racecar"]', expectedOutput: '"racecar"', isHidden: true },
      { input: '["Hello World"]', expectedOutput: '"dlroW olleH"', isHidden: true },
      { input: '["12345"]', expectedOutput: '"54321"', isHidden: true },
    ],
  },

  // =========================================================================
  // 3. FizzBuzz
  // =========================================================================
  {
    title: "FizzBuzz",
    functionName: "fizzBuzz",
    statement: `Given an integer \`n\`, return a string array \`answer\` (1-indexed) where:

- \`answer[i] == "FizzBuzz"\` if \`i\` is divisible by 3 and 5.
- \`answer[i] == "Fizz"\` if \`i\` is divisible by 3.
- \`answer[i] == "Buzz"\` if \`i\` is divisible by 5.
- \`answer[i] == i\` (as a string) if none of the above conditions are true.

**Example 1:**
\`\`\`
Input: n = 3
Output: ["1","2","Fizz"]
\`\`\`

**Example 2:**
\`\`\`
Input: n = 5
Output: ["1","2","Fizz","4","Buzz"]
\`\`\`

**Example 3:**
\`\`\`
Input: n = 15
Output: ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]
\`\`\`

**Constraints:**
- 1 <= n <= 10^4`,
    difficulty: Difficulty.EASY,
    category: "logic",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    solution: {
      python: `class Solution:
    def fizzBuzz(self, n: int) -> List[str]:
        result = []
        for i in range(1, n + 1):
            if i % 15 == 0:
                result.append("FizzBuzz")
            elif i % 3 == 0:
                result.append("Fizz")
            elif i % 5 == 0:
                result.append("Buzz")
            else:
                result.append(str(i))
        return result`,
      cpp: `class Solution {
public:
    vector<string> fizzBuzz(int n) {
        vector<string> result;
        for (int i = 1; i <= n; i++) {
            if (i % 15 == 0) {
                result.push_back("FizzBuzz");
            } else if (i % 3 == 0) {
                result.push_back("Fizz");
            } else if (i % 5 == 0) {
                result.push_back("Buzz");
            } else {
                result.push_back(to_string(i));
            }
        }
        return result;
    }
};`,
      java: `class Solution {
    public String[] fizzBuzz(int n) {
        String[] result = new String[n];
        for (int i = 1; i <= n; i++) {
            if (i % 15 == 0) {
                result[i - 1] = "FizzBuzz";
            } else if (i % 3 == 0) {
                result[i - 1] = "Fizz";
            } else if (i % 5 == 0) {
                result[i - 1] = "Buzz";
            } else {
                result[i - 1] = String.valueOf(i);
            }
        }
        return result;
    }
}`,
    },
    templates: {
      python: `class Solution:
    def fizzBuzz(self, n: int) -> List[str]:
        pass`,
      cpp: `class Solution {
public:
    vector<string> fizzBuzz(int n) {

    }
};`,
      java: `class Solution {
    public String[] fizzBuzz(int n) {

    }
}`,
    },
    drivers: {
      python: {
        header: `import json, sys
from typing import List, Optional`,
        footer: `sol = Solution()
_data = json.loads(sys.stdin.read())
_result = sol.fizzBuzz(_data[0])
print(json.dumps(_result))`,
      },
      cpp: {
        header: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <stack>
#include <sstream>
using namespace std;`,
        footer: `void printStringArray(const vector<string>& arr) {
    cout << "[";
    for (int i = 0; i < (int)arr.size(); i++) {
        if (i > 0) cout << ",";
        cout << "\\"" << arr[i] << "\\"";
    }
    cout << "]" << endl;
}

int main() {
    string line;
    getline(cin, line);
    string numStr;
    for (char c : line) {
        if (c == '-' || isdigit(c)) numStr += c;
    }
    int n = stoi(numStr);

    Solution sol;
    vector<string> result = sol.fizzBuzz(n);
    printStringArray(result);
    return 0;
}`,
      },
      java: {
        header: `import java.util.*;
import java.io.*;`,
        footer: `class Main {
    static String stringArrayToJson(String[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(",");
            sb.append("\\"").append(arr[i]).append("\\"");
        }
        sb.append("]");
        return sb.toString();
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        StringBuilder numStr = new StringBuilder();
        for (char c : line.toCharArray()) {
            if (c == '-' || Character.isDigit(c)) numStr.append(c);
        }
        int n = Integer.parseInt(numStr.toString());

        Solution sol = new Solution();
        String[] result = sol.fizzBuzz(n);
        System.out.println(stringArrayToJson(result));
    }
}`,
      },
    },
    testCases: [
      { input: "[3]", expectedOutput: '["1","2","Fizz"]', isHidden: false },
      { input: "[5]", expectedOutput: '["1","2","Fizz","4","Buzz"]', isHidden: false },
      { input: "[15]", expectedOutput: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]', isHidden: false },
      { input: "[1]", expectedOutput: '["1"]', isHidden: true },
      { input: "[2]", expectedOutput: '["1","2"]', isHidden: true },
      { input: "[10]", expectedOutput: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz"]', isHidden: true },
      { input: "[30]", expectedOutput: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz","16","17","Fizz","19","Buzz","Fizz","22","23","Fizz","Buzz","26","Fizz","28","29","FizzBuzz"]', isHidden: true },
    ],
  },

  // =========================================================================
  // 4. Palindrome Check
  // =========================================================================
  {
    title: "Palindrome Check",
    functionName: "isPalindrome",
    statement: `Given a string \`s\`, return \`true\` if it is a palindrome (reads the same forwards and backwards), or \`false\` otherwise.

The comparison is **case-sensitive**.

**Example 1:**
\`\`\`
Input: s = "racecar"
Output: true
Explanation: "racecar" reads the same forwards and backwards.
\`\`\`

**Example 2:**
\`\`\`
Input: s = "hello"
Output: false
\`\`\`

**Example 3:**
\`\`\`
Input: s = "a"
Output: true
\`\`\`

**Constraints:**
- 1 <= s.length <= 10^5
- \`s\` consists of printable ASCII characters.`,
    difficulty: Difficulty.EASY,
    category: "strings",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    solution: {
      python: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        return s == s[::-1]`,
      cpp: `class Solution {
public:
    bool isPalindrome(string s) {
        int left = 0, right = s.size() - 1;
        while (left < right) {
            if (s[left] != s[right]) return false;
            left++;
            right--;
        }
        return true;
    }
};`,
      java: `class Solution {
    public boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) return false;
            left++;
            right--;
        }
        return true;
    }
}`,
    },
    templates: {
      python: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        pass`,
      cpp: `class Solution {
public:
    bool isPalindrome(string s) {

    }
};`,
      java: `class Solution {
    public boolean isPalindrome(String s) {

    }
}`,
    },
    drivers: {
      python: {
        header: `import json, sys
from typing import List, Optional`,
        footer: `sol = Solution()
_data = json.loads(sys.stdin.read())
_result = sol.isPalindrome(_data[0])
print(json.dumps(_result))`,
      },
      cpp: {
        header: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <stack>
#include <sstream>
using namespace std;`,
        footer: `string parseString(const string& s) {
    int start = s.find('"');
    int end = s.rfind('"');
    if (start == (int)string::npos || start == end) return "";
    return s.substr(start + 1, end - start - 1);
}

void printBool(bool b) {
    cout << (b ? "true" : "false") << endl;
}

int main() {
    string line;
    getline(cin, line);
    string s = parseString(line);

    Solution sol;
    bool result = sol.isPalindrome(s);
    printBool(result);
    return 0;
}`,
      },
      java: {
        header: `import java.util.*;
import java.io.*;`,
        footer: `class Main {
    static String parseJsonString(String s) {
        s = s.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length() - 1);
        s = s.trim();
        if (s.startsWith("\\"") && s.endsWith("\\"")) s = s.substring(1, s.length() - 1);
        return s;
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        String s = parseJsonString(line);

        Solution sol = new Solution();
        boolean result = sol.isPalindrome(s);
        System.out.println(result ? "true" : "false");
    }
}`,
      },
    },
    testCases: [
      { input: '["racecar"]', expectedOutput: "true", isHidden: false },
      { input: '["hello"]', expectedOutput: "false", isHidden: false },
      { input: '["a"]', expectedOutput: "true", isHidden: false },
      { input: '["abba"]', expectedOutput: "true", isHidden: true },
      { input: '["ab"]', expectedOutput: "false", isHidden: true },
      { input: '["madam"]', expectedOutput: "true", isHidden: true },
      { input: '["abcba"]', expectedOutput: "true", isHidden: true },
      { input: '["abcde"]', expectedOutput: "false", isHidden: true },
    ],
  },

  // =========================================================================
  // 5. Max of Array
  // =========================================================================
  {
    title: "Max of Array",
    functionName: "findMax",
    statement: `Given an integer array \`nums\`, return the maximum element in the array.

**Example 1:**
\`\`\`
Input: nums = [3,1,4,1,5]
Output: 5
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [1]
Output: 1
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [-1,-2,-3]
Output: -1
\`\`\`

**Constraints:**
- 1 <= nums.length <= 10^5
- -10^9 <= nums[i] <= 10^9`,
    difficulty: Difficulty.EASY,
    category: "arrays",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    solution: {
      python: `class Solution:
    def findMax(self, nums: List[int]) -> int:
        result = nums[0]
        for num in nums:
            if num > result:
                result = num
        return result`,
      cpp: `class Solution {
public:
    int findMax(vector<int>& nums) {
        int result = nums[0];
        for (int i = 1; i < nums.size(); i++) {
            if (nums[i] > result) {
                result = nums[i];
            }
        }
        return result;
    }
};`,
      java: `class Solution {
    public int findMax(int[] nums) {
        int result = nums[0];
        for (int i = 1; i < nums.length; i++) {
            if (nums[i] > result) {
                result = nums[i];
            }
        }
        return result;
    }
}`,
    },
    templates: {
      python: `class Solution:
    def findMax(self, nums: List[int]) -> int:
        pass`,
      cpp: `class Solution {
public:
    int findMax(vector<int>& nums) {

    }
};`,
      java: `class Solution {
    public int findMax(int[] nums) {

    }
}`,
    },
    drivers: {
      python: {
        header: `import json, sys
from typing import List, Optional`,
        footer: `sol = Solution()
_data = json.loads(sys.stdin.read())
_result = sol.findMax(_data[0])
print(json.dumps(_result))`,
      },
      cpp: {
        header: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <stack>
#include <sstream>
using namespace std;`,
        footer: `vector<int> parseIntArray(const string& s) {
    vector<int> result;
    string num;
    for (char c : s) {
        if (c == '-' || isdigit(c)) num += c;
        else if (!num.empty()) { result.push_back(stoi(num)); num.clear(); }
    }
    if (!num.empty()) result.push_back(stoi(num));
    return result;
}

int main() {
    string line;
    getline(cin, line);
    // Input is [[3,1,4,1,5]] — find inner array
    int start = line.find('[', 1);
    int end = line.rfind(']', line.size() - 2);
    string arrStr = line.substr(start, end - start + 1);
    vector<int> nums = parseIntArray(arrStr);

    Solution sol;
    int result = sol.findMax(nums);
    cout << result << endl;
    return 0;
}`,
      },
      java: {
        header: `import java.util.*;
import java.io.*;`,
        footer: `class Main {
    static int[] parseIntArray(String s) {
        s = s.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length() - 1);
        if (s.isEmpty()) return new int[0];
        String[] parts = s.split(",");
        int[] result = new int[parts.length];
        for (int i = 0; i < parts.length; i++) result[i] = Integer.parseInt(parts[i].trim());
        return result;
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        int start = line.indexOf('[', 1);
        int end = line.lastIndexOf(']', line.length() - 2);
        String arrStr = line.substring(start, end + 1);
        int[] nums = parseIntArray(arrStr);

        Solution sol = new Solution();
        int result = sol.findMax(nums);
        System.out.println(result);
    }
}`,
      },
    },
    testCases: [
      { input: "[[3,1,4,1,5]]", expectedOutput: "5", isHidden: false },
      { input: "[[1]]", expectedOutput: "1", isHidden: false },
      { input: "[[-1,-2,-3]]", expectedOutput: "-1", isHidden: false },
      { input: "[[0,0,0,0]]", expectedOutput: "0", isHidden: true },
      { input: "[[10,20,30,40,50,60]]", expectedOutput: "60", isHidden: true },
      { input: "[[-1000000,0,1000000]]", expectedOutput: "1000000", isHidden: true },
      { input: "[[5,5,5,5,5]]", expectedOutput: "5", isHidden: true },
    ],
  },

  // =========================================================================
  // 6. Count Vowels
  // =========================================================================
  {
    title: "Count Vowels",
    functionName: "countVowels",
    statement: `Given a string \`s\`, return the number of vowels in the string. Vowels are \`a\`, \`e\`, \`i\`, \`o\`, \`u\` (case-insensitive).

**Example 1:**
\`\`\`
Input: s = "hello"
Output: 2
Explanation: The vowels are 'e' and 'o'.
\`\`\`

**Example 2:**
\`\`\`
Input: s = "AEIOU"
Output: 5
\`\`\`

**Example 3:**
\`\`\`
Input: s = "xyz"
Output: 0
\`\`\`

**Constraints:**
- 1 <= s.length <= 10^5
- \`s\` consists of English letters.`,
    difficulty: Difficulty.EASY,
    category: "strings",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    solution: {
      python: `class Solution:
    def countVowels(self, s: str) -> int:
        return sum(1 for c in s.lower() if c in 'aeiou')`,
      cpp: `class Solution {
public:
    int countVowels(string s) {
        int count = 0;
        for (char c : s) {
            char lower = tolower(c);
            if (lower == 'a' || lower == 'e' || lower == 'i' || lower == 'o' || lower == 'u') {
                count++;
            }
        }
        return count;
    }
};`,
      java: `class Solution {
    public int countVowels(String s) {
        int count = 0;
        for (char c : s.toLowerCase().toCharArray()) {
            if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') {
                count++;
            }
        }
        return count;
    }
}`,
    },
    templates: {
      python: `class Solution:
    def countVowels(self, s: str) -> int:
        pass`,
      cpp: `class Solution {
public:
    int countVowels(string s) {

    }
};`,
      java: `class Solution {
    public int countVowels(String s) {

    }
}`,
    },
    drivers: {
      python: {
        header: `import json, sys
from typing import List, Optional`,
        footer: `sol = Solution()
_data = json.loads(sys.stdin.read())
_result = sol.countVowels(_data[0])
print(json.dumps(_result))`,
      },
      cpp: {
        header: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <stack>
#include <sstream>
using namespace std;`,
        footer: `string parseString(const string& s) {
    int start = s.find('"');
    int end = s.rfind('"');
    if (start == (int)string::npos || start == end) return "";
    return s.substr(start + 1, end - start - 1);
}

int main() {
    string line;
    getline(cin, line);
    string s = parseString(line);

    Solution sol;
    int result = sol.countVowels(s);
    cout << result << endl;
    return 0;
}`,
      },
      java: {
        header: `import java.util.*;
import java.io.*;`,
        footer: `class Main {
    static String parseJsonString(String s) {
        s = s.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length() - 1);
        s = s.trim();
        if (s.startsWith("\\"") && s.endsWith("\\"")) s = s.substring(1, s.length() - 1);
        return s;
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        String s = parseJsonString(line);

        Solution sol = new Solution();
        int result = sol.countVowels(s);
        System.out.println(result);
    }
}`,
      },
    },
    testCases: [
      { input: '["hello"]', expectedOutput: "2", isHidden: false },
      { input: '["AEIOU"]', expectedOutput: "5", isHidden: false },
      { input: '["xyz"]', expectedOutput: "0", isHidden: false },
      { input: '["Programming"]', expectedOutput: "3", isHidden: true },
      { input: '["a"]', expectedOutput: "1", isHidden: true },
      { input: '["bcdfg"]', expectedOutput: "0", isHidden: true },
      { input: '["AeIoU"]', expectedOutput: "5", isHidden: true },
    ],
  },

  // =========================================================================
  // 7. Fibonacci
  // =========================================================================
  {
    title: "Fibonacci",
    functionName: "fib",
    statement: `The **Fibonacci numbers**, commonly denoted \`F(n)\`, form a sequence such that each number is the sum of the two preceding ones, starting from \`0\` and \`1\`. That is:

\`\`\`
F(0) = 0, F(1) = 1
F(n) = F(n - 1) + F(n - 2), for n > 1
\`\`\`

Given \`n\`, return \`F(n)\`.

**Example 1:**
\`\`\`
Input: n = 2
Output: 1
Explanation: F(2) = F(1) + F(0) = 1 + 0 = 1.
\`\`\`

**Example 2:**
\`\`\`
Input: n = 3
Output: 2
Explanation: F(3) = F(2) + F(1) = 1 + 1 = 2.
\`\`\`

**Example 3:**
\`\`\`
Input: n = 10
Output: 55
\`\`\`

**Constraints:**
- 0 <= n <= 30`,
    difficulty: Difficulty.MEDIUM,
    category: "math",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    solution: {
      python: `class Solution:
    def fib(self, n: int) -> int:
        a, b = 0, 1
        for _ in range(n):
            a, b = b, a + b
        return a`,
      cpp: `class Solution {
public:
    int fib(int n) {
        if (n == 0) return 0;
        int a = 0, b = 1;
        for (int i = 0; i < n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        return a;
    }
};`,
      java: `class Solution {
    public int fib(int n) {
        if (n == 0) return 0;
        int a = 0, b = 1;
        for (int i = 0; i < n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        return a;
    }
}`,
    },
    templates: {
      python: `class Solution:
    def fib(self, n: int) -> int:
        pass`,
      cpp: `class Solution {
public:
    int fib(int n) {

    }
};`,
      java: `class Solution {
    public int fib(int n) {

    }
}`,
    },
    drivers: {
      python: {
        header: `import json, sys
from typing import List, Optional`,
        footer: `sol = Solution()
_data = json.loads(sys.stdin.read())
_result = sol.fib(_data[0])
print(json.dumps(_result))`,
      },
      cpp: {
        header: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <stack>
#include <sstream>
using namespace std;`,
        footer: `int main() {
    string line;
    getline(cin, line);
    string numStr;
    for (char c : line) {
        if (c == '-' || isdigit(c)) numStr += c;
    }
    int n = stoi(numStr);

    Solution sol;
    int result = sol.fib(n);
    cout << result << endl;
    return 0;
}`,
      },
      java: {
        header: `import java.util.*;
import java.io.*;`,
        footer: `class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        StringBuilder numStr = new StringBuilder();
        for (char c : line.toCharArray()) {
            if (c == '-' || Character.isDigit(c)) numStr.append(c);
        }
        int n = Integer.parseInt(numStr.toString());

        Solution sol = new Solution();
        int result = sol.fib(n);
        System.out.println(result);
    }
}`,
      },
    },
    testCases: [
      { input: "[0]", expectedOutput: "0", isHidden: false },
      { input: "[1]", expectedOutput: "1", isHidden: false },
      { input: "[10]", expectedOutput: "55", isHidden: false },
      { input: "[2]", expectedOutput: "1", isHidden: true },
      { input: "[5]", expectedOutput: "5", isHidden: true },
      { input: "[20]", expectedOutput: "6765", isHidden: true },
      { input: "[30]", expectedOutput: "832040", isHidden: true },
    ],
  },

  // =========================================================================
  // 8. Sort Array
  // =========================================================================
  {
    title: "Sort Array",
    functionName: "sortArray",
    statement: `Given an array of integers \`nums\`, sort the array in ascending order and return it.

**Example 1:**
\`\`\`
Input: nums = [5,2,3,1]
Output: [1,2,3,5]
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [5,1,1,2,0,0]
Output: [0,0,1,1,2,5]
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [1]
Output: [1]
\`\`\`

**Constraints:**
- 1 <= nums.length <= 5 * 10^4
- -5 * 10^4 <= nums[i] <= 5 * 10^4`,
    difficulty: Difficulty.MEDIUM,
    category: "sorting",
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    solution: {
      python: `class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        return sorted(nums)`,
      cpp: `class Solution {
public:
    vector<int> sortArray(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        return nums;
    }
};`,
      java: `class Solution {
    public int[] sortArray(int[] nums) {
        Arrays.sort(nums);
        return nums;
    }
}`,
    },
    templates: {
      python: `class Solution:
    def sortArray(self, nums: List[int]) -> List[int]:
        pass`,
      cpp: `class Solution {
public:
    vector<int> sortArray(vector<int>& nums) {

    }
};`,
      java: `class Solution {
    public int[] sortArray(int[] nums) {

    }
}`,
    },
    drivers: {
      python: {
        header: `import json, sys
from typing import List, Optional`,
        footer: `sol = Solution()
_data = json.loads(sys.stdin.read())
_result = sol.sortArray(_data[0])
print(json.dumps(_result))`,
      },
      cpp: {
        header: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <stack>
#include <sstream>
using namespace std;`,
        footer: `vector<int> parseIntArray(const string& s) {
    vector<int> result;
    string num;
    for (char c : s) {
        if (c == '-' || isdigit(c)) num += c;
        else if (!num.empty()) { result.push_back(stoi(num)); num.clear(); }
    }
    if (!num.empty()) result.push_back(stoi(num));
    return result;
}

void printIntArray(const vector<int>& arr) {
    cout << "[";
    for (int i = 0; i < (int)arr.size(); i++) {
        if (i > 0) cout << ",";
        cout << arr[i];
    }
    cout << "]" << endl;
}

int main() {
    string line;
    getline(cin, line);
    int start = line.find('[', 1);
    int end = line.rfind(']', line.size() - 2);
    string arrStr = line.substr(start, end - start + 1);
    vector<int> nums = parseIntArray(arrStr);

    Solution sol;
    vector<int> result = sol.sortArray(nums);
    printIntArray(result);
    return 0;
}`,
      },
      java: {
        header: `import java.util.*;
import java.io.*;`,
        footer: `class Main {
    static int[] parseIntArray(String s) {
        s = s.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length() - 1);
        if (s.isEmpty()) return new int[0];
        String[] parts = s.split(",");
        int[] result = new int[parts.length];
        for (int i = 0; i < parts.length; i++) result[i] = Integer.parseInt(parts[i].trim());
        return result;
    }

    static String intArrayToJson(int[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(arr[i]);
        }
        sb.append("]");
        return sb.toString();
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        int start = line.indexOf('[', 1);
        int end = line.lastIndexOf(']', line.length() - 2);
        String arrStr = line.substring(start, end + 1);
        int[] nums = parseIntArray(arrStr);

        Solution sol = new Solution();
        int[] result = sol.sortArray(nums);
        System.out.println(intArrayToJson(result));
    }
}`,
      },
    },
    testCases: [
      { input: "[[5,3,1,4,2]]", expectedOutput: "[1,2,3,4,5]", isHidden: false },
      { input: "[[5,1,1,2,0,0]]", expectedOutput: "[0,0,1,1,2,5]", isHidden: false },
      { input: "[[1]]", expectedOutput: "[1]", isHidden: false },
      { input: "[[4,3,2,1]]", expectedOutput: "[1,2,3,4]", isHidden: true },
      { input: "[[-1,-3,-2]]", expectedOutput: "[-3,-2,-1]", isHidden: true },
      { input: "[[1,1,1,1,1]]", expectedOutput: "[1,1,1,1,1]", isHidden: true },
      { input: "[[100,-50,0,25,-25,50]]", expectedOutput: "[-50,-25,0,25,50,100]", isHidden: true },
    ],
  },

  // =========================================================================
  // 9. Binary Search
  // =========================================================================
  {
    title: "Binary Search",
    functionName: "search",
    statement: `Given a sorted (in ascending order) integer array \`nums\` of \`n\` elements and a \`target\` value, return the index of \`target\` in \`nums\`. If \`target\` is not found, return \`-1\`.

**Example 1:**
\`\`\`
Input: nums = [-1,0,3,5,9,12], target = 9
Output: 4
Explanation: 9 exists in nums and its index is 4.
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [-1,0,3,5,9,12], target = 2
Output: -1
Explanation: 2 does not exist in nums so return -1.
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [1,2,3,4,5], target = 3
Output: 2
\`\`\`

**Constraints:**
- 1 <= nums.length <= 10^4
- -10^4 < nums[i], target < 10^4
- All the integers in \`nums\` are unique.
- \`nums\` is sorted in ascending order.`,
    difficulty: Difficulty.MEDIUM,
    category: "searching",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    solution: {
      python: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1`,
      cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        int lo = 0, hi = nums.size() - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return -1;
    }
};`,
      java: `class Solution {
    public int search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return -1;
    }
}`,
    },
    templates: {
      python: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        pass`,
      cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {

    }
};`,
      java: `class Solution {
    public int search(int[] nums, int target) {

    }
}`,
    },
    drivers: {
      python: {
        header: `import json, sys
from typing import List, Optional`,
        footer: `sol = Solution()
_data = json.loads(sys.stdin.read())
_result = sol.search(_data[0], _data[1])
print(json.dumps(_result))`,
      },
      cpp: {
        header: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <stack>
#include <sstream>
using namespace std;`,
        footer: `vector<int> parseIntArray(const string& s) {
    vector<int> result;
    string num;
    for (char c : s) {
        if (c == '-' || isdigit(c)) num += c;
        else if (!num.empty()) { result.push_back(stoi(num)); num.clear(); }
    }
    if (!num.empty()) result.push_back(stoi(num));
    return result;
}

int main() {
    string line;
    getline(cin, line);
    int depth = 0, arrStart = -1, arrEnd = -1;
    for (int i = 0; i < (int)line.size(); i++) {
        if (line[i] == '[') {
            depth++;
            if (depth == 2) arrStart = i;
        } else if (line[i] == ']') {
            if (depth == 2) arrEnd = i;
            depth--;
        }
    }
    string arrStr = line.substr(arrStart, arrEnd - arrStart + 1);
    vector<int> nums = parseIntArray(arrStr);
    string rest = line.substr(arrEnd + 1);
    string numStr;
    for (char c : rest) {
        if (c == '-' || isdigit(c)) numStr += c;
    }
    int target = 0;
    if (!numStr.empty()) target = stoi(numStr);

    Solution sol;
    int result = sol.search(nums, target);
    cout << result << endl;
    return 0;
}`,
      },
      java: {
        header: `import java.util.*;
import java.io.*;`,
        footer: `class Main {
    static int[] parseIntArray(String s) {
        s = s.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length() - 1);
        if (s.isEmpty()) return new int[0];
        String[] parts = s.split(",");
        int[] result = new int[parts.length];
        for (int i = 0; i < parts.length; i++) result[i] = Integer.parseInt(parts[i].trim());
        return result;
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        int depth = 0, arrStart = -1, arrEnd = -1;
        for (int i = 0; i < line.length(); i++) {
            if (line.charAt(i) == '[') {
                depth++;
                if (depth == 2) arrStart = i;
            } else if (line.charAt(i) == ']') {
                if (depth == 2) arrEnd = i;
                depth--;
            }
        }
        String arrStr = line.substring(arrStart, arrEnd + 1);
        int[] nums = parseIntArray(arrStr);
        String rest = line.substring(arrEnd + 1);
        StringBuilder numStr = new StringBuilder();
        for (char c : rest.toCharArray()) {
            if (c == '-' || Character.isDigit(c)) numStr.append(c);
        }
        int target = Integer.parseInt(numStr.toString());

        Solution sol = new Solution();
        int result = sol.search(nums, target);
        System.out.println(result);
    }
}`,
      },
    },
    testCases: [
      { input: "[[1,2,3,4,5],3]", expectedOutput: "2", isHidden: false },
      { input: "[[-1,0,3,5,9,12],9]", expectedOutput: "4", isHidden: false },
      { input: "[[-1,0,3,5,9,12],2]", expectedOutput: "-1", isHidden: false },
      { input: "[[1],1]", expectedOutput: "0", isHidden: true },
      { input: "[[1,2,3,4],4]", expectedOutput: "3", isHidden: true },
      { input: "[[1,2,3],0]", expectedOutput: "-1", isHidden: true },
      { input: "[[2,4,6,8,10,12],10]", expectedOutput: "4", isHidden: true },
      { input: "[[1,3,5,7,9],7]", expectedOutput: "3", isHidden: true },
    ],
  },

  // =========================================================================
  // 10. Valid Parentheses
  // =========================================================================
  {
    title: "Valid Parentheses",
    functionName: "isValid",
    statement: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

**Example 1:**
\`\`\`
Input: s = "()"
Output: true
\`\`\`

**Example 2:**
\`\`\`
Input: s = "()[]{}"
Output: true
\`\`\`

**Example 3:**
\`\`\`
Input: s = "(]"
Output: false
\`\`\`

**Constraints:**
- 1 <= s.length <= 10^4
- \`s\` consists of parentheses only \`'()[]{}'\`.`,
    difficulty: Difficulty.HARD,
    category: "stacks",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    solution: {
      python: `class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}
        for c in s:
            if c in '({[':
                stack.append(c)
            elif c in mapping:
                if not stack or stack[-1] != mapping[c]:
                    return False
                stack.pop()
        return len(stack) == 0`,
      cpp: `class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char c : s) {
            if (c == '(' || c == '{' || c == '[') {
                st.push(c);
            } else {
                if (st.empty()) return false;
                char top = st.top();
                if ((c == ')' && top != '(') ||
                    (c == '}' && top != '{') ||
                    (c == ']' && top != '[')) {
                    return false;
                }
                st.pop();
            }
        }
        return st.empty();
    }
};`,
      java: `class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c);
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if ((c == ')' && top != '(') ||
                    (c == '}' && top != '{') ||
                    (c == ']' && top != '[')) {
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }
}`,
    },
    templates: {
      python: `class Solution:
    def isValid(self, s: str) -> bool:
        pass`,
      cpp: `class Solution {
public:
    bool isValid(string s) {

    }
};`,
      java: `class Solution {
    public boolean isValid(String s) {

    }
}`,
    },
    drivers: {
      python: {
        header: `import json, sys
from typing import List, Optional`,
        footer: `sol = Solution()
_data = json.loads(sys.stdin.read())
_result = sol.isValid(_data[0])
print(json.dumps(_result))`,
      },
      cpp: {
        header: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <stack>
#include <sstream>
using namespace std;`,
        footer: `string parseString(const string& s) {
    int start = s.find('"');
    int end = s.rfind('"');
    if (start == (int)string::npos || start == end) return "";
    return s.substr(start + 1, end - start - 1);
}

void printBool(bool b) {
    cout << (b ? "true" : "false") << endl;
}

int main() {
    string line;
    getline(cin, line);
    string s = parseString(line);

    Solution sol;
    bool result = sol.isValid(s);
    printBool(result);
    return 0;
}`,
      },
      java: {
        header: `import java.util.*;
import java.io.*;`,
        footer: `class Main {
    static String parseJsonString(String s) {
        s = s.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length() - 1);
        s = s.trim();
        if (s.startsWith("\\"") && s.endsWith("\\"")) s = s.substring(1, s.length() - 1);
        return s;
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        String s = parseJsonString(line);

        Solution sol = new Solution();
        boolean result = sol.isValid(s);
        System.out.println(result ? "true" : "false");
    }
}`,
      },
    },
    testCases: [
      { input: '["()"]', expectedOutput: "true", isHidden: false },
      { input: '["()[]{}"]', expectedOutput: "true", isHidden: false },
      { input: '["(]"]', expectedOutput: "false", isHidden: false },
      { input: '["([)]"]', expectedOutput: "false", isHidden: true },
      { input: '["{[]}"]', expectedOutput: "true", isHidden: true },
      { input: '["((("]', expectedOutput: "false", isHidden: true },
      { input: '["({[]})"]', expectedOutput: "true", isHidden: true },
      { input: '["]]"]', expectedOutput: "false", isHidden: true },
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
