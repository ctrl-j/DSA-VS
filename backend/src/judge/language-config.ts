// language config

export interface LanguageConfig {
    image: string; // docker image name
    compiled: boolean; // bool for python
    fileName: string;
    // function that returns compile cmd as array of args
    compileCmd?: (codePath: string) => string[];
    // function that runs the command as an arr of strings
    runCmd: (codePath: string) => string[];
}

export const LANGUAGES: Record<string, LanguageConfig> = {
    python: {
        image: "dsavs-runner-python",
        compiled: false,
        fileName: "solution.py",
        runCmd: (codePath) => ["python", codePath],
    },
    cpp: {
        image: "dsavs-runner-cpp",
        compiled: true,
        fileName: "solution.cpp",
        compileCmd: (codePath) => ["g++", "-o", "/code/solution", codePath],
        runCmd: (_codePath) => ["/code/solution"]
    },
    java: { 
        image: "dsavs-runner-java",
        compiled: true,
        fileName: "Solution.java",
        compileCmd: (codePath) => ["javac", codePath],
        runCmd: (_codePath) => ["java", "-cp", "/code", "Solution"],
    },
};