import type { Achievement, Challenge, Difficulty, Mission, World } from "./types";

type ChallengeSeed = Omit<Challenge, "id" | "xp">;
type MissionSeed = Pick<Mission, "name" | "description" | "difficulty" | "topic"> & { challenges: ChallengeSeed[] };
type WorldSeed = Pick<World, "id" | "name" | "subtitle" | "description" | "topic" | "boss" | "accent" | "icon"> & { missions: MissionSeed[] };

const c = (type: Challenge["type"], title: string, question: string, answer: string, explanation: string, topic: string, difficulty: Difficulty = "Easy", code?: string, options?: string[], hint = "Read the code one line at a time and focus on the value being changed."): ChallengeSeed => ({
  type, title, question, answer, explanation, topic, difficulty, ...(code ? { code } : {}), ...(options ? { options } : {}), hint,
});

const worldSeeds: WorldSeed[] = [
  {
    id: "variables", name: "Variable Valley", subtitle: "Where every value finds a home", description: "Restore the valley's power cells by learning how JavaScript stores and changes data.", topic: "Variables", boss: "BUGLORD", accent: "#b8f36b", icon: "◈",
    missions: [
      { name: "Variable Activation", description: "Bring the valley's dormant data cells online.", difficulty: "Easy", topic: "let & const", challenges: [
        c("choice", "Choose your container", "Which declaration lets you assign a new value later?", "let", "`let` allows reassignment. Use `const` when the binding should stay fixed.", "let & const", "Easy", undefined, ["const", "let", "typeof"]),
        c("output", "Power reading", "What value is logged after the update?", "8", "The variable starts at 5, then `+= 3` adds three to the stored value.", "Assignment", "Easy", "let power = 5;\npower += 3;\nconsole.log(power);", ["5", "8", "53", "Error"]),
        c("completion", "Seal the value", "Complete the declaration so `planet` cannot be reassigned.", "const", "`const` protects the variable binding from reassignment.", "const", "Easy", "___ planet = \"Nova\";", undefined, "This value is not meant to be reassigned."),
      ] },
      { name: "Data Type Detector", description: "Identify the signals hidden in the source stream.", difficulty: "Easy", topic: "Data types", challenges: [
        c("choice", "Signal classification", "What is the type of the value `true`?", "boolean", "A boolean has one of two values: `true` or `false`.", "Data types", "Easy", undefined, ["string", "number", "boolean"]),
        c("output", "Count the charge", "What does this expression evaluate to?", "number", "`typeof` reports the type of `42`, which is `number`.", "Data types", "Easy", "console.log(typeof 42);", ["number", "string", "boolean", "42"]),
        c("debugging", "Broken label", "Find the bug in this declaration.", "Missing closing quote", "A string must have matching opening and closing quotes.", "Strings", "Easy", "const callSign = \"Explorer;", undefined, "Check that the text literal is opened and closed."),
      ] },
      { name: "Power Core Repair", description: "Reroute assignments and restart the core.", difficulty: "Medium", topic: "Expressions", challenges: [
        c("choice", "Core equation", "Which expression joins `first` and `last` with a space between them?", "first + \" \" + last", "The `+` operator concatenates strings, so add a space string between the names.", "Expressions", "Medium", undefined, ["first + last", "first + \" \" + last", "first, \" \", last"]),
        c("output", "Temperature check", "What is the final value of `temperature`?", "21", "The initial value is 18; adding 3 stores 21.", "Assignment", "Easy", "let temperature = 18;\ntemperature = temperature + 3;\nconsole.log(temperature);", ["18", "21", "183", "3"]),
        c("completion", "Restore the equation", "Fill in the operator that adds the two values.", " + ", "The addition operator combines the two numeric values.", "Expressions", "Easy", "const total = 12 ___ 4;", undefined, "Use the operator for arithmetic addition."),
      ] },
    ],
  },
  {
    id: "logic", name: "Logic Castle", subtitle: "Decisions guard every gate", description: "Rebuild the castle's decision engines with conditions, comparisons, and boolean logic.", topic: "Logic", boss: "LOGIC WRAITH", accent: "#8b8cff", icon: "⌘",
    missions: [
      { name: "Gatekeeper Logic", description: "Teach the gates when to open.", difficulty: "Easy", topic: "if / else", challenges: [
        c("choice", "Open sesame", "Which keyword runs code only when a condition is true?", "if", "`if` evaluates a condition and runs its block when that condition is truthy.", "if / else", "Easy", undefined, ["if", "return", "for"]),
        c("output", "Gate status", "What is printed?", "open", "Since 7 is greater than 3, the `if` block runs.", "Comparisons", "Easy", "if (7 > 3) {\n  console.log(\"open\");\n} else {\n  console.log(\"closed\");\n}", ["open", "closed", "true", "Nothing"]),
        c("completion", "Set the threshold", "Complete the comparison so the gate opens at level 5 or above.", ">=", "`>=` means greater than or equal to.", "Comparisons", "Easy", "if (level ___ 5) openGate();"),
      ] },
      { name: "Security Decision", description: "Route trusted signals through the security grid.", difficulty: "Medium", topic: "Boolean logic", challenges: [
        c("choice", "Two keys required", "Which operator is true only when both conditions are true?", "&&", "`&&` is logical AND; both sides must be true.", "Logical operators", "Medium", undefined, ["||", "&&", "!"]),
        c("output", "Access check", "What is the value of `canEnter`?", "false", "The second comparison is false, so `true && false` evaluates to false.", "Boolean values", "Medium", "const canEnter = true && (2 > 5);\nconsole.log(canEnter);", ["true", "false", "2", "Error"]),
        c("debugging", "Unsafe comparison", "Why does this check fail for the number 4?", "It compares a number to a string", "Strict equality (`===`) does not coerce types. Compare the value to the number `4`, not the string `\"4\"`.", "Comparisons", "Medium", "const code = 4;\nif (code === \"4\") unlock();", undefined, "Look closely at the type on each side of `===`."),
      ] },
      { name: "Castle Defense", description: "Defend the inner keep with a reliable fallback path.", difficulty: "Medium", topic: "Conditions", challenges: [
        c("choice", "Fallback route", "Which keyword adds an alternative branch when an `if` condition is false?", "else", "`else` provides a fallback block for the false path.", "if / else", "Easy", undefined, ["else", "const", "break"]),
        c("output", "Choose a route", "What is logged when `lives` is 1?", "careful", "The first condition is false, so the `else` branch runs.", "Conditions", "Easy", "const lives = 1;\nif (lives > 1) console.log(\"ready\");\nelse console.log(\"careful\");", ["ready", "careful", "1", "Nothing"]),
        c("completion", "Flip the signal", "Fill in the operator that negates a boolean.", "!", "The `!` operator turns `true` into `false` and vice versa.", "Logical operators", "Medium", "const locked = ___isOpen;"),
      ] },
    ],
  },
  {
    id: "loops", name: "Loop District", subtitle: "Keep the city moving", description: "Restart the district's iteration engines and learn to repeat work safely.", topic: "Loops", boss: "LOOP BEAST", accent: "#ffb85c", icon: "⟳",
    missions: [
      { name: "Loop Repair", description: "Get the district's first iteration engine running.", difficulty: "Easy", topic: "for loops", challenges: [
        c("choice", "Repeat this task", "Which loop is commonly used when you know the number of repetitions?", "for", "A `for` loop keeps initialization, condition, and update together.", "for loops", "Easy", undefined, ["for", "if", "switch"]),
        c("output", "Count the pulses", "What is the final value of `sum`?", "6", "The loop adds 1, then 2, then 3 to `sum`.", "Iteration", "Easy", "let sum = 0;\nfor (let i = 1; i <= 3; i++) sum += i;\nconsole.log(sum);", ["3", "6", "123", "4"]),
        c("completion", "Set the loop limit", "Make this loop run for 4 values: 0, 1, 2, and 3.", "4", "Starting at zero, `i < 4` runs for 0 through 3.", "Loop conditions", "Easy", "for (let i = 0; i < ___; i++) log(i);"),
      ] },
      { name: "Iteration Engine", description: "Synchronize a loop with the engine's counter.", difficulty: "Medium", topic: "Loop conditions", challenges: [
        c("choice", "One step at a time", "What does `i++` do?", "Adds 1 to i", "`i++` increments `i` by one.", "for loops", "Easy", undefined, ["Adds 1 to i", "Sets i to 0", "Subtracts 1 from i"]),
        c("output", "Read the counter", "Which values are logged?", "0, 1, 2", "`i < 3` is true for 0, 1, and 2, then stops at 3.", "Loop conditions", "Medium", "for (let i = 0; i < 3; i++) console.log(i);", ["0, 1, 2", "1, 2, 3", "0, 1, 2, 3", "3"]),
        c("debugging", "Stalled engine", "Why does this loop never stop?", "The counter never changes", "Because `i` stays 0, the condition `i < 3` remains true forever. Increment `i` in the update step.", "Infinite loops", "Medium", "for (let i = 0; i < 3;) {\n  console.log(i);\n}", undefined, "Check whether the loop's counter makes progress."),
      ] },
      { name: "Infinite Loop Escape", description: "Escape a stalled while-loop without losing data.", difficulty: "Medium", topic: "while loops", challenges: [
        c("choice", "Loop with a condition", "When does a `while` loop stop?", "When its condition becomes false", "A `while` loop repeats as long as its condition is true.", "while loops", "Easy", undefined, ["After exactly one run", "When its condition becomes false", "When it sees a semicolon"]),
        c("output", "Countdown", "What value is printed last?", "1", "The loop logs 3, 2, and 1; after decrementing to 0 the condition is false.", "while loops", "Medium", "let n = 3;\nwhile (n > 0) {\n  console.log(n);\n  n--;\n}", ["0", "1", "3", "It never stops"]),
        c("completion", "Add a step", "Fill in the statement that moves this countdown toward zero.", "n--", "Decrementing `n` eventually makes `n > 0` false.", "while loops", "Medium", "while (n > 0) {\n  ___;\n}"),
      ] },
    ],
  },
  {
    id: "functions", name: "Function Fortress", subtitle: "Small tools, mighty results", description: "Rebuild reusable tools by passing data in and returning answers out.", topic: "Functions", boss: "FUNCTION OVERLORD", accent: "#52dfd0", icon: "ƒ",
    missions: [
      { name: "Function Forge", description: "Shape reusable tools from simple instructions.", difficulty: "Easy", topic: "Functions", challenges: [
        c("choice", "Build a tool", "Which keyword declares a standard JavaScript function?", "function", "`function` introduces a named function declaration.", "Functions", "Easy", undefined, ["function", "method", "define"]),
        c("output", "Run the helper", "What value is logged?", "10", "`double(5)` returns `5 * 2`, which is 10.", "Return values", "Easy", "function double(n) { return n * 2; }\nconsole.log(double(5));", ["5", "7", "10", "undefined"]),
        c("completion", "Name the input", "Complete the parameter so `greet(\"Ari\")` can use the name.", "name", "Parameters are named inputs available inside the function body.", "Parameters", "Easy", "function greet(___) { return \"Hi \" + name; }"),
      ] },
      { name: "Parameter Bridge", description: "Pass the right values across the bridge.", difficulty: "Medium", topic: "Parameters", challenges: [
        c("choice", "Send two values", "In `add(a, b)`, what are `a` and `b`?", "Parameters", "The names in a function definition are parameters; supplied values are arguments.", "Parameters", "Easy", undefined, ["Arguments", "Parameters", "Properties"]),
        c("output", "Follow the return", "What does `area(4)` return?", "16", "The argument 4 becomes `side`; multiplying it by itself returns 16.", "Return values", "Medium", "function area(side) { return side * side; }\nconsole.log(area(4));", ["8", "16", "4", "undefined"]),
        c("debugging", "Missing result", "Why does `triple(3)` evaluate to `undefined`?", "The function does not return a value", "Calling `console.log` inside a function does not return that value. Use `return n * 3`.", "Return values", "Medium", "function triple(n) {\n  console.log(n * 3);\n}", undefined, "Printing a value and returning a value are different."),
      ] },
      { name: "Fortress Automation", description: "Connect helpers together to restore the fortress.", difficulty: "Medium", topic: "Function calls", challenges: [
        c("choice", "Reusable or repeated?", "What is a key benefit of putting logic in a function?", "It can be reused by calling it", "A function packages behavior so you can call it from multiple places.", "Function calls", "Easy", undefined, ["It runs only once", "It can be reused by calling it", "It automatically stores data"]),
        c("output", "Call order", "What is logged?", "ready", "The function runs only when called; the call logs `ready`.", "Function calls", "Medium", "function boot() { return \"ready\"; }\nconsole.log(boot());", ["boot", "ready", "undefined", "Nothing"]),
        c("completion", "Return the signal", "Finish the function so it gives its result back to the caller.", "return", "`return` sends a value back from the function.", "Return values", "Medium", "function status() {\n  ___ \"online\";\n}"),
      ] },
    ],
  },
  {
    id: "arrays", name: "Array Canyon", subtitle: "A landscape of ordered data", description: "Cross the canyon by collecting, indexing, and updating ordered values.", topic: "Arrays", boss: "INDEX HYDRA", accent: "#ff769e", icon: "▤",
    missions: [
      { name: "Index Expedition", description: "Find items in the canyon's ordered collection.", difficulty: "Easy", topic: "Indexing", challenges: [
        c("choice", "First position", "What index accesses the first item in a JavaScript array?", "0", "JavaScript arrays are zero-indexed, so the first item is at index 0.", "Indexing", "Easy", undefined, ["0", "1", "-1"]),
        c("output", "Pick a fruit", "What is logged?", "pear", "`fruits[1]` accesses the second item because indexes start at zero.", "Indexing", "Easy", "const fruits = [\"lime\", \"pear\", \"fig\"];\nconsole.log(fruits[1]);", ["lime", "pear", "fig", "1"]),
        c("completion", "Count the supplies", "Complete the property that gives the number of items.", "length", "The `.length` property gives the number of elements in an array.", "Array length", "Easy", "const count = items.___;"),
      ] },
      { name: "Length of the Canyon", description: "Measure the canyon and navigate its end.", difficulty: "Medium", topic: "Array length", challenges: [
        c("choice", "Add to the pack", "Which method adds an item to the end of an array?", "push", "`push` appends one or more items to the end of an array.", "Array operations", "Easy", undefined, ["push", "pop", "shift"]),
        c("output", "Pack check", "What is `tools.length` after this code?", "3", "`push` adds the new item, increasing the original length of 2 to 3.", "Array length", "Easy", "const tools = [\"map\", \"key\"];\ntools.push(\"torch\");\nconsole.log(tools.length);", ["2", "3", "4", "torch"]),
        c("debugging", "Off-by-one", "Why can this loop access an undefined item?", "It uses <= instead of <", "The final valid index is `length - 1`; using `<= length` accesses one past the end.", "Indexing", "Medium", "for (let i = 0; i <= items.length; i++) {\n  use(items[i]);\n}", undefined, "Compare the last valid index with the loop's boundary."),
      ] },
      { name: "Supply Cache", description: "Update and retrieve cached expedition supplies.", difficulty: "Medium", topic: "Array operations", challenges: [
        c("choice", "Remove the last item", "Which method removes and returns the last array item?", "pop", "`pop` removes and returns the final item.", "Array operations", "Medium", undefined, ["pop", "push", "slice"]),
        c("output", "Index shift", "What is the first item after this operation?", "\"b\"", "`shift` removes the first item, so the new first value is `b`.", "Array operations", "Medium", "const letters = [\"a\", \"b\", \"c\"];\nletters.shift();\nconsole.log(letters[0]);", ["\"a\"", "\"b\"", "\"c\"", "undefined"]),
        c("completion", "Get the final item", "Complete the index expression to access the last item.", "items.length - 1", "Since indexes begin at zero, the final item's index is one less than the length.", "Indexing", "Medium", "const last = items[___];"),
      ] },
    ],
  },
  {
    id: "objects", name: "Object City", subtitle: "Every property has a place", description: "Bring the city back online by reading and updating structured objects.", topic: "Objects", boss: "PROPERTY PHANTOM", accent: "#c18cff", icon: "▦",
    missions: [
      { name: "Property Patrol", description: "Locate values stored in the city's records.", difficulty: "Easy", topic: "Properties", challenges: [
        c("choice", "Read the record", "How do you access the `name` property of `hero`?", "hero.name", "Dot notation reads a property whose name is known.", "Properties", "Easy", undefined, ["hero.name", "hero->name", "name.hero"]),
        c("output", "City registry", "What value is logged?", "\"Nova\"", "Dot notation retrieves the value stored in the `name` property.", "Properties", "Easy", "const pilot = { name: \"Nova\" };\nconsole.log(pilot.name);", ["pilot", "\"Nova\"", "name", "undefined"]),
        c("completion", "Set the district", "Complete the property access for the object's `district` value.", "city.district", "Use the object's name, a dot, and then the property name.", "Properties", "Easy", "const place = ___;"),
      ] },
      { name: "Object Observatory", description: "Inspect properties and update the live city model.", difficulty: "Medium", topic: "Object data", challenges: [
        c("choice", "Update the record", "Which assignment changes `robot.status` to `\"ready\"`?", "robot.status = \"ready\"", "Assigning to the property updates the value on the object.", "Object data", "Easy", undefined, ["robot = status", "robot.status = \"ready\"", "status.robot(\"ready\")"]),
        c("output", "City census", "What is logged?", "3", "`visitors.count` reads the nested `count` value, which is 3.", "Object data", "Medium", "const visitors = { count: 3 };\nconsole.log(visitors.count);", ["\"count\"", "3", "visitors", "undefined"]),
        c("debugging", "Wrong address", "What causes this property lookup to return `undefined`?", "The property name does not match", "Property names are exact: the object has `color`, not `colour`.", "Properties", "Medium", "const car = { color: \"blue\" };\nconsole.log(car.colour);", undefined, "Compare the requested property spelling with the object key."),
      ] },
      { name: "Method Metro", description: "Connect actions to the objects that perform them.", difficulty: "Medium", topic: "Methods", challenges: [
        c("choice", "An object's action", "What is a method?", "A function stored as an object property", "A method is a function value associated with an object.", "Methods", "Medium", undefined, ["A variable with no value", "A function stored as an object property", "A special array index"]),
        c("output", "Call the method", "What is printed?", "\"beep\"", "Calling `bot.sound()` invokes the function stored on `sound`.", "Methods", "Medium", "const bot = { sound() { return \"beep\"; } };\nconsole.log(bot.sound());", ["sound", "\"beep\"", "undefined", "bot"]),
        c("completion", "Run the action", "Complete the expression to call the object's `launch` method.", "ship.launch()", "Methods are called with parentheses after the property name.", "Methods", "Easy", "const result = ___;"),
      ] },
    ],
  },
  {
    id: "algorithms", name: "Algorithm Core", subtitle: "Think clearly. Solve anything.", description: "Combine everything you've learned to trace, debug, and restore the Code Core.", topic: "Algorithms", boss: "THE NULL POINTER", accent: "#ffc86a", icon: "⌬",
    missions: [
      { name: "Signal Sort", description: "Trace a short sequence and follow every step.", difficulty: "Medium", topic: "Tracing", challenges: [
        c("choice", "First principles", "What is an algorithm?", "A sequence of steps for solving a problem", "An algorithm is a finite, ordered set of instructions that solves a task.", "Problem solving", "Easy", undefined, ["A sequence of steps for solving a problem", "A special JavaScript keyword", "A type of variable"]),
        c("output", "Trace the values", "What is the final value of `score`?", "5", "The score starts at 2, gains 4, then loses 1, leaving 5.", "Tracing", "Medium", "let score = 2;\nscore += 4;\nscore -= 1;\nconsole.log(score);", ["5", "6", "7", "1"]),
        c("completion", "Guard an empty list", "Complete the comparison so this check detects an empty array.", "0", "An empty array has a length of zero.", "Conditions", "Medium", "if (items.length === ___) return null;"),
      ] },
      { name: "Debugging Depths", description: "Find the faulty assumption hiding in the core.", difficulty: "Hard", topic: "Debugging", challenges: [
        c("choice", "Choose the exact check", "Which operator checks equality without converting types?", "===", "Strict equality checks both value and type without coercion.", "Comparisons", "Medium", undefined, ["=", "==", "==="]),
        c("debugging", "Trace the return", "Which line makes this function return the wrong result?", "return a + 1;", "The function is meant to add `a` and `b`, but it ignores `b` and adds 1 instead.", "Debugging", "Hard", "function add(a, b) {\n  return a + 1;\n}", undefined, "Compare the return expression with the function's intended inputs."),
        c("output", "Follow the branch", "What is logged?", "safe", "The value is below 10, so the `else` branch logs `safe`.", "Conditions", "Medium", "const load = 8;\nif (load > 10) console.log(\"busy\");\nelse console.log(\"safe\");", ["busy", "safe", "8", "Nothing"]),
      ] },
      { name: "Core Reboot", description: "Put your skills together for the final system check.", difficulty: "Hard", topic: "Mixed concepts", challenges: [
        c("choice", "Pick the safe boundary", "To visit every array index, which condition is correct?", "i < items.length", "The valid indexes are 0 through `length - 1`, so use `< length`.", "Arrays & loops", "Medium", undefined, ["i <= items.length", "i < items.length", "i > items.length"]),
        c("output", "Final calculation", "What is logged?", "6", "The function returns 3 × 2, then the array's 0 index reads 6.", "Functions & arrays", "Hard", "function twice(n) { return n * 2; }\nconst values = [twice(3)];\nconsole.log(values[0]);", ["3", "5", "6", "undefined"]),
        c("debugging", "Core integrity", "Why does this loop miss the final item?", "The condition stops before the array length", "If you intend to process every array item, `i < items.length` includes the last valid index (`length - 1`). A condition of `i < items.length - 1` skips it.", "Debugging", "Hard", "for (let i = 0; i < items.length - 1; i++) {\n  process(items[i]);\n}", undefined, "Trace the loop's last value against the last valid index."),
      ] },
    ],
  },
];

const xpByDifficulty: Record<Difficulty, number> = { Easy: 50, Medium: 100, Hard: 150 };

export const worlds: World[] = worldSeeds.map((world) => ({
  ...world,
  missions: world.missions.map((mission, missionIndex) => ({
    ...mission,
    id: `${world.id}-mission-${missionIndex + 1}`,
    xp: 100,
    challenges: mission.challenges.map((challenge, challengeIndex) => ({
      ...challenge,
      id: `${world.id}-${missionIndex + 1}-${challengeIndex + 1}`,
      xp: xpByDifficulty[challenge.difficulty],
    })),
  })),
}));

export const achievements: Achievement[] = [
  { id: "first-quest", name: "First Quest", description: "Complete your first mission.", icon: "✦" },
  { id: "bug-hunter", name: "Bug Hunter", description: "Fix 10 debugging challenges.", icon: "⌕" },
  { id: "logic-master", name: "Logic Master", description: "Complete a Logic Castle mission.", icon: "⌘" },
  { id: "perfect-run", name: "Perfect Run", description: "Complete a mission without mistakes.", icon: "◇" },
  { id: "combo-master", name: "Combo Master", description: "Reach a 5x combo.", icon: "⚡" },
  { id: "boss-breaker", name: "Boss Breaker", description: "Defeat your first coding boss.", icon: "⬡" },
  { id: "code-master", name: "Code Master", description: "Complete all seven worlds.", icon: "♛" },
  { id: "daily-streak", name: "Daily Signal", description: "Complete a daily challenge.", icon: "◷" },
];

export const hiddenBugChallenges: Challenge[] = [
  {
    id: "hidden-bug-1", type: "debugging", title: "A tiny typo", question: "Find why this line does not run as intended.",
    code: "const total = 4;\nconsole.log(totla);", answer: "totla is misspelled",
    options: ["totla is misspelled", "A semicolon is missing", "The variable should use let"],
    explanation: "The declared variable is named `total`, but the log statement reads `totla`. JavaScript treats those as different identifiers.",
    difficulty: "Easy", topic: "Syntax", xp: 0, hint: "Look for a real runtime or syntax problem, not just a missing style choice.",
  },
  {
    id: "hidden-bug-2", type: "debugging", title: "Off-by-one bug", question: "Why does this loop run one time too many?",
    code: "for (let i = 0; i <= 3; i++) {\n  collect(i);\n}", answer: "It should use i < 3",
    explanation: "The `<=` includes 3, so the loop runs four times (0, 1, 2, 3). Use `< 3` for three values.",
    difficulty: "Easy", topic: "Loop conditions", xp: 0, hint: "Count how many values satisfy the condition.",
  },
  {
    id: "hidden-bug-3", type: "debugging", title: "The wrong equality", question: "What should the condition use to compare without type conversion?",
    code: "if (level == 5) unlock();", answer: "===",
    explanation: "`===` compares both type and value, avoiding the coercion performed by `==`.",
    difficulty: "Easy", topic: "Comparisons", xp: 0, hint: "There is an equality operator that also checks the type.",
  },
];

export function getChallenge(id: string): Challenge | undefined {
  for (const world of worlds) {
    for (const mission of world.missions) {
      const found = mission.challenges.find((challenge) => challenge.id === id);
      if (found) return found;
    }
  }
  return hiddenBugChallenges.find((challenge) => challenge.id === id);
}
