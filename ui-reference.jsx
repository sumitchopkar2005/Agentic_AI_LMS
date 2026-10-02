import { useState, useCallback } from "react";

const CHAPTERS = [
  {
    id: "mental-model",
    title: "The Mental Model",
    icon: "🧠",
    sections: [
      {
        title: "Forget the Textbook — Think Like This",
        content: `Before we touch Python, let's build an intuition that will never leave you.

**Imagine a library with no shelves.**

Every book is thrown in a pile. Want to find "Harry Potter"? You dig through EVERY book. That's an array search — O(n).

**Now imagine a library with magic shelves.**

You whisper "Harry Potter" and a spell instantly teleports you to the exact shelf. THAT is a hashmap — O(1).

The "spell" is called a **hash function**. It takes any key (like a book title) and converts it to an exact location (shelf number).`,
      },
      {
        title: "The Hash Function — Your Magic Spell",
        content: `A hash function does ONE job: convert any input into a fixed-size number.

Think of it like this:`,
        code: `# Conceptually, a hash function works like:
# "apple"  → 394  → slot 4  (394 % 10)
# "banana" → 712  → slot 2  (712 % 10)
# "cherry" → 283  → slot 3  (283 % 10)

# Python has a built-in hash() function
print(hash("apple"))    # Some large integer
print(hash("banana"))   # Different large integer
print(hash(42))         # Numbers hash to themselves (mostly)
print(hash((1, 2, 3)))  # Tuples can be hashed

# These CANNOT be hashed (they're mutable):
# hash([1, 2, 3])   ← ERROR! Lists can't be keys
# hash({1: 2})      ← ERROR! Dicts can't be keys`,
        insight: `🔑 GOLDEN RULE: Only IMMUTABLE types can be hashmap keys in Python.
Strings ✅  Numbers ✅  Tuples ✅  |  Lists ❌  Dicts ❌  Sets ❌

Why? If a key could change AFTER being stored, the hash function would point to the WRONG slot. The book moved but the spell still points to the old shelf!`,
      },
      {
        title: "Collisions — When Two Books Want the Same Shelf",
        content: `What if hash("apple") and hash("grape") both point to slot 4?

This is called a **collision**. Python handles it automatically using a technique called **open addressing** (it probes nearby slots).

You don't need to handle collisions yourself — but understanding they exist explains WHY:`,
        code: `# Worst case: ALL keys collide → O(n) lookup
# Average case: Few collisions → O(1) lookup
# Python's dict is VERY well optimized

# This is why dict operations are "amortized O(1)"
# meaning O(1) on average, with rare O(n) worst cases`,
        insight: `💡 "Amortized O(1)" means: if you do 1000 lookups, on average each one is O(1), even if one or two took longer. For interviews and practice, just say O(1).`,
      },
    ],
  },
  {
    id: "python-dict",
    title: "Python's dict — Your Weapon",
    icon: "⚔️",
    sections: [
      {
        title: "Four Ways to Create a Dict",
        content: `In Python, the hashmap is the \`dict\` (dictionary). Let's master EVERY way to create one:`,
        code: `# Method 1: Literal (most common)
scores = {"alice": 95, "bob": 87, "charlie": 92}

# Method 2: dict() constructor
scores = dict(alice=95, bob=87, charlie=92)

# Method 3: From list of tuples
pairs = [("alice", 95), ("bob", 87)]
scores = dict(pairs)

# Method 4: Dict comprehension (POWERFUL — memorize this)
squares = {x: x**2 for x in range(6)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16, 5: 25}

# Creating from two separate lists (ZIP pattern)
names = ["alice", "bob", "charlie"]
marks = [95, 87, 92]
scores = dict(zip(names, marks))
# {"alice": 95, "bob": 87, "charlie": 92}`,
        insight: `🎯 INTERVIEW TIP: Dict comprehension + zip() is a pattern that appears in 30%+ of hashmap problems. Burn it into muscle memory.`,
      },
      {
        title: "The 7 Operations You Must Know Cold",
        content: `Every dict problem boils down to these operations. No more, no less:`,
        code: `d = {"a": 1, "b": 2, "c": 3}

# ── 1. INSERT / UPDATE ──────────────────────
d["d"] = 4            # Insert new key
d["a"] = 10           # Update existing key
# Both are O(1)

# ── 2. LOOKUP ────────────────────────────────
val = d["a"]          # Returns 10. KeyError if missing!
val = d.get("z")      # Returns None if missing (SAFE)
val = d.get("z", 0)   # Returns 0 if missing (SAFER)
# O(1)

# ── 3. DELETE ────────────────────────────────
del d["d"]            # Removes key "d". KeyError if missing!
val = d.pop("b")      # Removes AND returns value (2)
val = d.pop("z", -1)  # Returns -1 if missing (SAFE)
# O(1)

# ── 4. CHECK EXISTENCE ──────────────────────
if "a" in d:          # True — O(1)!!
    print("found")
# NEVER do: if "a" in d.keys() ← wasteful

# ── 5. ITERATE ───────────────────────────────
for key in d:                    # Keys only
    print(key)
for val in d.values():           # Values only
    print(val)
for key, val in d.items():       # Both (most useful)
    print(key, val)
# All O(n)

# ── 6. SIZE ──────────────────────────────────
length = len(d)       # O(1)

# ── 7. MERGE (Python 3.9+) ──────────────────
d1 = {"a": 1}
d2 = {"b": 2}
merged = d1 | d2      # {"a": 1, "b": 2}
d1 |= d2              # In-place merge`,
        insight: `⚠️ THE #1 BEGINNER MISTAKE:
Using d["key"] when the key might not exist → KeyError crash.
ALWAYS use d.get("key", default) unless you're 100% sure the key exists.
This single habit will prevent 80% of your hashmap bugs.`,
      },
      {
        title: "defaultdict — Your Secret Superpower",
        content: `This is the single most useful tool for hashmap problems. It eliminates the "check if key exists" boilerplate:`,
        code: `from collections import defaultdict

# ── WITHOUT defaultdict (ugly, repetitive) ────
word_count = {}
for word in ["apple", "banana", "apple", "cherry", "banana", "apple"]:
    if word in word_count:
        word_count[word] += 1
    else:
        word_count[word] = 1
# {"apple": 3, "banana": 2, "cherry": 1}

# ── WITH defaultdict (clean, elegant) ─────────
word_count = defaultdict(int)  # Missing keys default to 0
for word in ["apple", "banana", "apple", "cherry", "banana", "apple"]:
    word_count[word] += 1
# Same result, half the code!

# ── Common default factories ──────────────────
defaultdict(int)    # Default: 0     → counting
defaultdict(list)   # Default: []    → grouping
defaultdict(set)    # Default: set() → unique grouping
defaultdict(str)    # Default: ""    → string building

# ── Grouping example ──────────────────────────
students = [("A", "Alice"), ("B", "Bob"), ("A", "Amy"), ("B", "Ben")]
groups = defaultdict(list)
for grade, name in students:
    groups[grade].append(name)
# {"A": ["Alice", "Amy"], "B": ["Bob", "Ben"]}`,
        insight: `🏆 PATTERN RECOGNITION:
• See "count frequency of..." → defaultdict(int)
• See "group items by..." → defaultdict(list)
• See "find unique items per..." → defaultdict(set)
Memorize these three. They cover 70% of hashmap problems.`,
      },
      {
        title: "Counter — Counting on Steroids",
        content: `When your problem is purely about counting, Counter is even faster than defaultdict:`,
        code: `from collections import Counter

# ── Basic counting ────────────────────────────
words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
count = Counter(words)
# Counter({"apple": 3, "banana": 2, "cherry": 1})

# ── Counting characters in a string ──────────
count = Counter("mississippi")
# Counter({"s": 4, "i": 4, "p": 2, "m": 1})

# ── POWERFUL methods ──────────────────────────
count.most_common(2)     # [("s", 4), ("i", 4)] — top 2
count["s"]               # 4
count["z"]               # 0 (no KeyError!)

# ── Counter arithmetic (game-changer) ─────────
a = Counter("aabbc")     # {"a": 2, "b": 2, "c": 1}
b = Counter("abbcc")     # {"a": 1, "b": 2, "c": 2}

a - b    # Counter({"a": 1}) — what a has MORE of
a + b    # Counter({"b": 4, "a": 3, "c": 3}) — combined
a & b    # Counter({"b": 2, "a": 1, "c": 1}) — minimum
a | b    # Counter({"a": 2, "b": 2, "c": 2}) — maximum`,
        insight: `🎯 WHEN TO USE WHAT:
• Need to count things → Counter (fastest, cleanest)
• Need to group things → defaultdict(list)
• Need general key-value storage → regular dict
• Need ordered insertion → regular dict (Python 3.7+, insertion order preserved)`,
      },
    ],
  },
  {
    id: "patterns",
    title: "The 6 Problem Patterns",
    icon: "🧩",
    sections: [
      {
        title: "Pattern 1: Frequency Count",
        content: `**"How many times does each element appear?"**
This is the bread and butter. If a problem mentions counting, frequency, or "most common" — reach for a hashmap.`,
        code: `# PROBLEM: Find the first non-repeating character
# "leetcode" → "l" (first char that appears only once)

def first_unique_char(s):
    count = Counter(s)             # Step 1: Count everything
    for i, ch in enumerate(s):     # Step 2: Find first with count 1
        if count[ch] == 1:
            return i
    return -1

# WHY this works:
# count = {"l":1, "e":3, "t":1, "c":1, "o":1, "d":1}
# Walk string left→right, "l" has count 1 → return 0

# ──────────────────────────────────────────────
# PROBLEM: Check if two strings are anagrams
# "listen", "silent" → True

def is_anagram(s, t):
    return Counter(s) == Counter(t)  # One line. Done.

# WHY: Anagrams have identical character frequencies.
# Counter("listen") == Counter("silent")
# {"l":1,"i":1,"s":1,"t":1,"e":1,"n":1} == same → True`,
        insight: `🧠 THINKING FRAMEWORK for frequency problems:
1. "What am I counting?" → that's your dict key
2. "What do I do with the counts?" → filter / compare / find max
3. Choose tool: Counter for pure counting, defaultdict(int) if you need more control`,
      },
      {
        title: "Pattern 2: Two Sum / Complement Lookup",
        content: `**"Find two elements that satisfy a condition."**
THE most famous hashmap pattern. Instead of checking all pairs O(n²), store what you've SEEN and check if the COMPLEMENT exists.`,
        code: `# PROBLEM: Two Sum
# nums = [2, 7, 11, 15], target = 9
# Return indices [0, 1] because nums[0] + nums[1] = 9

def two_sum(nums, target):
    seen = {}  # val → index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:       # Have we seen what we need?
            return [seen[complement], i]
        seen[num] = i                # Store what we've seen
    return []

# TRACE through it:
# i=0: num=2,  complement=7, seen={} → not found → seen={2:0}
# i=1: num=7,  complement=2, seen={2:0} → FOUND! → [0, 1]

# ──────────────────────────────────────────────
# The SAME pattern applies to many problems:
# • Two Sum → complement = target - num
# • Two Sum with product → complement = target / num  
# • Pair with given difference → complement = num ± k
# • Subarray sum (with prefix sums) → complement = prefix - target`,
        insight: `🔑 THE COMPLEMENT TRICK (memorize this thought process):
1. "For each element, WHAT WOULD I NEED to solve the problem?"
2. "Have I SEEN that needed element before?"
3. If yes → answer found. If no → store current element and move on.

This converts O(n²) brute force into O(n) single pass. It's the #1 reason hashmaps exist in competitive programming.`,
      },
      {
        title: "Pattern 3: Grouping / Categorizing",
        content: `**"Group elements that share a property."**
Whenever you need to bucket items by some characteristic, hashmaps shine:`,
        code: `# PROBLEM: Group Anagrams
# ["eat","tea","tan","ate","nat","bat"]
# → [["eat","tea","ate"], ["tan","nat"], ["bat"]]

def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = tuple(sorted(s))    # Anagrams share sorted form
        groups[key].append(s)
    return list(groups.values())

# HOW IT WORKS:
# "eat" → sorted = "aet" → key = ("a","e","t")
# "tea" → sorted = "aet" → key = ("a","e","t")  ← same bucket!
# "bat" → sorted = "abt" → key = ("a","b","t")  ← different

# ──────────────────────────────────────────────
# PROBLEM: Group numbers by their remainder
nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
groups = defaultdict(list)
for n in nums:
    groups[n % 3].append(n)
# {1: [1,4,7], 2: [2,5,8], 0: [3,6,9]}`,
        insight: `🧠 GROUPING FRAMEWORK:
1. "What property defines the group?" → that becomes your KEY
2. "What am I collecting?" → that goes in the VALUE (usually a list)
3. The key MUST be hashable — if it's a list, convert to tuple!

Common keys: sorted string, remainder, first letter, length, tuple of properties`,
      },
      {
        title: "Pattern 4: Seen Before / Duplicate Detection",
        content: `**"Have I encountered this before?"**
Using a hashmap (or set) as a "memory" of what you've processed:`,
        code: `# PROBLEM: Contains Duplicate
# Return True if any value appears at least twice

def contains_duplicate(nums):
    seen = set()          # set is a hashmap without values
    for num in nums:
        if num in seen:   # O(1) lookup
            return True
        seen.add(num)
    return False

# ──────────────────────────────────────────────
# PROBLEM: Longest Consecutive Sequence
# [100, 4, 200, 1, 3, 2] → 4 (sequence: 1,2,3,4)

def longest_consecutive(nums):
    num_set = set(nums)
    best = 0
    
    for n in num_set:
        # Only start counting from sequence START
        if n - 1 not in num_set:  # n is a start!
            length = 1
            while n + length in num_set:  # O(1) checks
                length += 1
            best = max(best, length)
    return best

# KEY INSIGHT: set lookup is O(1), so we can
# "probe" for consecutive numbers efficiently`,
        insight: `💡 SET vs DICT:
• set = hashmap that only stores KEYS (no values)
• Use set when you only care about existence ("have I seen this?")
• Use dict when you also need associated data ("when/where did I see this?")
• Both have O(1) lookup — choose based on whether you need values`,
      },
      {
        title: "Pattern 5: Prefix Sum + HashMap",
        content: `**"Find subarray with given sum / count subarrays with property X"**
This is the ADVANCED pattern that separates intermediate from advanced:`,
        code: `# PROBLEM: Subarray Sum Equals K
# Count subarrays whose elements sum to k
# nums = [1, 2, 3], k = 3 → 2 (subarrays: [1,2] and [3])

def subarray_sum(nums, k):
    count = 0
    prefix_sum = 0
    seen = {0: 1}  # prefix_sum → how many times we've seen it
    
    for num in nums:
        prefix_sum += num
        # If (prefix_sum - k) was seen before,
        # then the subarray between THEN and NOW sums to k!
        if prefix_sum - k in seen:
            count += seen[prefix_sum - k]
        seen[prefix_sum] = seen.get(prefix_sum, 0) + 1
    
    return count

# VISUAL TRACE for nums=[1,2,3], k=3:
# ┌─────────┬────────────┬────────────┬───────┬────────────┐
# │   num   │ prefix_sum │ need (p-k) │  seen │   count    │
# ├─────────┼────────────┼────────────┼───────┼────────────┤
# │  start  │     0      │     -      │ {0:1} │     0      │
# │    1    │     1      │    -2      │ +{1:1}│     0      │
# │    2    │     3      │     0      │ +{3:1}│  0+1 = 1   │
# │    3    │     6      │     3      │ +{6:1}│  1+1 = 2   │
# └─────────┴────────────┴────────────┴───────┴────────────┘
# prefix_sum=3: need 0, seen[0]=1 → found 1 subarray [1,2]
# prefix_sum=6: need 3, seen[3]=1 → found 1 subarray [3]`,
        insight: `🔑 WHY THIS WORKS (the "aha!" moment):
If prefix_sum at index j = 10, and prefix_sum at index i = 7, and k = 3...
then sum of elements from i+1 to j = 10 - 7 = 3 = k!

So for each position, we ask: "Is there a PREVIOUS prefix sum that's exactly k less than my current sum?" That's the complement trick again!

This pattern solves: subarray sum = k, subarray sum divisible by k, equal 0s and 1s, and many more.`,
      },
      {
        title: "Pattern 6: Sliding Window + HashMap",
        content: `**"Find longest/shortest substring/subarray with some constraint"**
HashMap tracks the window's state as it slides:`,
        code: `# PROBLEM: Longest Substring Without Repeating Characters
# "abcabcbb" → 3 ("abc")

def length_of_longest_substring(s):
    last_seen = {}   # char → last index where it appeared
    start = 0        # left edge of window
    max_len = 0
    
    for end, ch in enumerate(s):
        # If char was seen AND is inside our current window
        if ch in last_seen and last_seen[ch] >= start:
            start = last_seen[ch] + 1   # shrink window
        last_seen[ch] = end
        max_len = max(max_len, end - start + 1)
    
    return max_len

# TRACE for "abcabcbb":
# end=0 'a': window="a",      max=1
# end=1 'b': window="ab",     max=2
# end=2 'c': window="abc",    max=3
# end=3 'a': 'a' seen at 0 → start=1, window="bca", max=3
# end=4 'b': 'b' seen at 1 → start=2, window="cab", max=3
# ...

# ──────────────────────────────────────────────
# PROBLEM: Minimum Window Substring
# s="ADOBECODEBANC", t="ABC" → "BANC"

def min_window(s, t):
    need = Counter(t)        # What we need
    missing = len(t)         # How many chars still missing
    start = 0
    result = (0, float("inf"))
    
    for end, ch in enumerate(s):
        if need[ch] > 0:     # This char is needed
            missing -= 1
        need[ch] -= 1
        
        while missing == 0:  # Window contains all of t
            if end - start < result[1] - result[0]:
                result = (start, end)
            need[s[start]] += 1
            if need[s[start]] > 0:
                missing += 1
            start += 1
    
    return "" if result[1] == float("inf") else s[result[0]:result[1]+1]`,
        insight: `🧠 SLIDING WINDOW + HASHMAP FRAMEWORK:
1. HashMap tracks the STATE of your window (char counts, seen positions, etc.)
2. Expand window by moving right pointer
3. Shrink window by moving left pointer when constraint is violated
4. HashMap updates are O(1), so the whole thing is O(n)

This combo solves: longest substring without repeats, minimum window substring, longest substring with at most k distinct chars, and more.`,
      },
    ],
  },
  {
    id: "complexity",
    title: "Time & Space Mastery",
    icon: "⏱️",
    sections: [
      {
        title: "The Complexity Cheat Sheet",
        content: `Know these cold. No thinking required — instant recall:`,
        code: `# ┌──────────────────────┬──────────┬───────────┐
# │     Operation        │   Time   │   Space   │
# ├──────────────────────┼──────────┼───────────┤
# │ d[key] = val         │   O(1)   │   O(1)    │
# │ d[key] / d.get(key)  │   O(1)   │   O(1)    │
# │ del d[key]           │   O(1)   │   O(1)    │
# │ key in d             │   O(1)   │   O(1)    │
# │ len(d)               │   O(1)   │   O(1)    │
# │ for k in d           │   O(n)   │   O(1)    │
# │ d.items() / .keys()  │   O(n)   │   O(n)*   │
# │ dict comprehension   │   O(n)   │   O(n)    │
# │ d1 == d2             │   O(n)   │   O(1)    │
# └──────────────────────┴──────────┴───────────┘
# * .keys() returns a view (O(1) space), list(d.keys()) is O(n)

# COMPARISON WITH OTHER DATA STRUCTURES:
# ┌──────────────┬──────────┬──────────┬───────────┐
# │  Operation   │  Array   │  Sorted  │  HashMap  │
# │              │          │  Array   │           │
# ├──────────────┼──────────┼──────────┼───────────┤
# │  Search      │   O(n)   │ O(log n) │   O(1)    │
# │  Insert      │   O(1)*  │   O(n)   │   O(1)    │
# │  Delete      │   O(n)   │   O(n)   │   O(1)    │
# │  Ordered?    │   Yes    │   Yes    │   No**    │
# └──────────────┴──────────┴──────────┴───────────┘
# * append is O(1), insert at position is O(n)
# ** Python 3.7+ preserves insertion order, not sorted order`,
        insight: `🔑 THE FUNDAMENTAL TRADEOFF:
Hashmaps trade SPACE for TIME.
• You use O(n) extra memory
• You get O(1) lookups in return

When an interviewer asks "can you do better than O(n²)?" — your FIRST thought should be: "Can I use a hashmap to avoid repeated work?"`,
      },
      {
        title: "When NOT to Use a HashMap",
        content: `Knowing when NOT to use a tool is just as important:`,
        code: `# ❌ DON'T use hashmap when:

# 1. Data is already sorted → use binary search O(log n)
#    (hashmap won't be faster AND wastes space)

# 2. You need elements in sorted order → use sorted array + 
#    bisect, or a balanced BST / SortedList

# 3. You need the k-th smallest/largest → use heap (O(n log k))
#    (hashmap has no ordering concept)

# 4. Range queries ("all keys between 5 and 10")
#    → use sorted structure or segment tree

# 5. Data fits in fixed small range → use array!
counts = [0] * 26  # For counting lowercase letters
# WAY faster than dict for this use case

# ✅ DO use hashmap when:
# • Need O(1) lookup by arbitrary key
# • Need to count/group/categorize
# • Need to check "have I seen this before?"
# • Need to avoid O(n²) nested loops`,
        insight: `💡 DECISION FLOWCHART:
Need fast lookup by key? → HashMap
Need sorted order? → Sorted structure
Need min/max efficiently? → Heap
Keys are small integers (0-1000)? → Array (faster!)
Need to check membership only? → Set (simpler HashMap)`,
      },
    ],
  },
  {
    id: "practice",
    title: "Practice Problems",
    icon: "🏋️",
    sections: [
      {
        title: "Level 1: Warm Up",
        content: `Start here. If these feel easy, good — your foundation is solid.`,
        code: `# ── Problem 1: Two Sum (Classic) ──────────────
# Given nums and target, return indices of two
# numbers that add up to target.
# Pattern: Complement Lookup

def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i

# ── Problem 2: Valid Anagram ─────────────────
# Are s and t anagrams of each other?
# Pattern: Frequency Count

def is_anagram(s, t):
    return Counter(s) == Counter(t)

# ── Problem 3: Contains Duplicate ────────────
# Does any value appear more than once?
# Pattern: Seen Before

def contains_dup(nums):
    return len(nums) != len(set(nums))`,
        insight: `📝 PRACTICE STRATEGY:
1. Read the problem
2. Before coding, say: "Which of the 6 patterns is this?"
3. Code the solution
4. Trace through with a small example by hand`,
      },
      {
        title: "Level 2: Building Confidence",
        content: `These require combining patterns or thinking a step deeper:`,
        code: `# ── Problem 4: Majority Element ───────────────
# Find element appearing more than n/2 times
# Pattern: Frequency Count

def majority_element(nums):
    count = Counter(nums)
    return max(count, key=count.get)
    # OR: return count.most_common(1)[0][0]

# ── Problem 5: Intersection of Two Arrays ────
# Return common elements (with duplicates)
# Pattern: Frequency Count + Comparison

def intersect(nums1, nums2):
    c1 = Counter(nums1)
    c2 = Counter(nums2)
    result = []
    for num in c1:
        # Take minimum count from both
        result.extend([num] * min(c1[num], c2[num]))
    return result
    # SHORTER: (c1 & c2).elements() → gives same result!

# ── Problem 6: Isomorphic Strings ────────────
# "egg" and "add" → True (e→a, g→d)
# "foo" and "bar" → False (o can't map to both a and r)
# Pattern: Dual Mapping

def is_isomorphic(s, t):
    if len(s) != len(t):
        return False
    s_to_t = {}
    t_to_s = {}
    for cs, ct in zip(s, t):
        if cs in s_to_t and s_to_t[cs] != ct:
            return False
        if ct in t_to_s and t_to_s[ct] != cs:
            return False
        s_to_t[cs] = ct
        t_to_s[ct] = cs
    return True`,
        insight: `🧠 NOTICE: Problem 6 uses TWO hashmaps for bidirectional mapping. This is a sub-pattern worth remembering — whenever you need a ONE-TO-ONE mapping, you need TWO dicts (forward + reverse).`,
      },
      {
        title: "Level 3: Interview Ready",
        content: `These are real interview-level problems. Master these and you're ready:`,
        code: `# ── Problem 7: Group Anagrams ─────────────────
# Pattern: Grouping

def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        groups[tuple(sorted(s))].append(s)
    return list(groups.values())

# ── Problem 8: Subarray Sum Equals K ─────────
# Count subarrays with sum = k
# Pattern: Prefix Sum + HashMap

def subarray_sum(nums, k):
    count, prefix = 0, 0
    seen = defaultdict(int)
    seen[0] = 1
    for num in nums:
        prefix += num
        count += seen[prefix - k]
        seen[prefix] += 1
    return count

# ── Problem 9: Longest Consecutive Sequence ──
# Pattern: Set as HashMap + Smart Start Detection

def longest_consecutive(nums):
    s = set(nums)
    best = 0
    for n in s:
        if n - 1 not in s:   # only start from sequence beginning
            length = 1
            while n + length in s:
                length += 1
            best = max(best, length)
    return best

# ── Problem 10: LRU Cache ────────────────────
# Pattern: HashMap + Doubly Linked List (OrderedDict)

from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cache = OrderedDict()
        self.cap = capacity
    
    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)  # Mark as recently used
        return self.cache[key]
    
    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)  # Remove oldest`,
        insight: `🏆 THE PATH TO MASTERY:
1. Solve each problem yourself FIRST (even if it takes 30 min)
2. Compare with the solution above
3. Identify which PATTERN it uses
4. Solve it again from scratch next day without looking
5. If you can solve it in under 5 minutes → you own it

These 10 problems cover ALL 6 patterns. Once you can solve them cold, any new hashmap problem will be a variation of something you've already seen.`,
      },
    ],
  },
  {
    id: "mistakes",
    title: "Common Pitfalls",
    icon: "🪤",
    sections: [
      {
        title: "The 8 Mistakes That Trip Everyone Up",
        content: `Learn from others' pain. Each of these has bitten thousands of programmers:`,
        code: `# ── MISTAKE 1: KeyError from direct access ─────
d = {"a": 1}
# val = d["b"]          # 💥 KeyError!
val = d.get("b", 0)     # ✅ Returns 0 safely

# ── MISTAKE 2: Modifying dict while iterating ──
d = {"a": 1, "b": 2, "c": 3}
# for k in d:
#     if d[k] < 2:
#         del d[k]      # 💥 RuntimeError!
# ✅ Iterate over a copy of keys:
for k in list(d.keys()):
    if d[k] < 2:
        del d[k]

# ── MISTAKE 3: Mutable default values ──────────
# d.setdefault("key", []).append(1)  # Works but confusing
# ✅ Use defaultdict instead — clearer intent

# ── MISTAKE 4: Using list as dict key ──────────
# d = {[1,2]: "value"}  # 💥 TypeError: unhashable type
d = {(1,2): "value"}    # ✅ Use tuple instead

# ── MISTAKE 5: Forgetting {0: 1} in prefix sum ─
# In subarray sum problems, always initialize:
seen = {0: 1}  # Without this, you miss subarrays starting at index 0!

# ── MISTAKE 6: Checking d.keys() instead of d ──
# if key in d.keys():  # ❌ Works but wasteful
if key in d:           # ✅ Same result, more Pythonic

# ── MISTAKE 7: Not handling empty input ─────────
def solve(nums):
    if not nums:       # ✅ Always handle edge case
        return 0
    # ... rest of solution

# ── MISTAKE 8: Using dict when set suffices ─────
# seen = {}
# seen[num] = True     # ❌ Unnecessary values
seen = set()
seen.add(num)          # ✅ Cleaner, same O(1) lookup`,
        insight: `🎯 PRE-CODING CHECKLIST (do this before writing any hashmap solution):
□ What's my key? Is it hashable?
□ What's my value? (Or do I just need a set?)
□ What if the key doesn't exist? (Use .get() or defaultdict)
□ Am I handling empty input?
□ Do I need {0: 1} initialization? (prefix sum problems)`,
      },
    ],
  },
];

const CodeBlock = ({ code }) => (
  <pre
    style={{
      background: "#1a1b26",
      color: "#c0caf5",
      padding: "20px",
      borderRadius: "8px",
      overflowX: "auto",
      fontSize: "13px",
      lineHeight: "1.7",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
      border: "1px solid #2a2b3d",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    }}
  >
    {code.split("\n").map((line, i) => {
      const isComment = line.trimStart().startsWith("#");
      const isTable = line.includes("│") || line.includes("├") || line.includes("┌") || line.includes("└");
      return (
        <div key={i} style={{ color: isComment ? "#7aa2f7" : isTable ? "#9ece6a" : "#c0caf5", minHeight: "1.7em" }}>
          {line || " "}
        </div>
      );
    })}
  </pre>
);

const InsightBox = ({ text }) => (
  <div
    style={{
      background: "linear-gradient(135deg, #1a1f35 0%, #0f1729 100%)",
      border: "1px solid #3b4874",
      borderLeft: "4px solid #7aa2f7",
      borderRadius: "8px",
      padding: "18px 20px",
      margin: "16px 0",
      fontSize: "14px",
      lineHeight: "1.8",
      color: "#a9b1d6",
      whiteSpace: "pre-wrap",
    }}
  >
    {text}
  </div>
);

export default function HashmapMasterclass() {
  const [activeChapter, setActiveChapter] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [completedSections, setCompletedSections] = useState({});

  const chapter = CHAPTERS[activeChapter];
  const section = chapter.sections[activeSection];
  const totalSections = CHAPTERS.reduce((s, c) => s + c.sections.length, 0);
  const completedCount = Object.keys(completedSections).length;

  const markComplete = useCallback(() => {
    const key = `${activeChapter}-${activeSection}`;
    setCompletedSections((prev) => ({ ...prev, [key]: true }));
    if (activeSection < chapter.sections.length - 1) {
      setActiveSection((s) => s + 1);
    } else if (activeChapter < CHAPTERS.length - 1) {
      setActiveChapter((c) => c + 1);
      setActiveSection(0);
    }
  }, [activeChapter, activeSection, chapter.sections.length]);

  const goBack = useCallback(() => {
    if (activeSection > 0) {
      setActiveSection((s) => s - 1);
    } else if (activeChapter > 0) {
      setActiveChapter((c) => c - 1);
      setActiveSection(CHAPTERS[activeChapter - 1].sections.length - 1);
    }
  }, [activeChapter, activeSection]);

  const isLast = activeChapter === CHAPTERS.length - 1 && activeSection === chapter.sections.length - 1;
  const isFirst = activeChapter === 0 && activeSection === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e0e0f0", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #1a1040 50%, #0a0a1a 100%)", borderBottom: "1px solid #2a2b4d", padding: "24px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: "12px", letterSpacing: "4px", textTransform: "uppercase", color: "#7aa2f7", marginBottom: 8, fontWeight: 600 }}>
            Python Masterclass
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: "#e0e0f0", letterSpacing: "-0.5px" }}>
            HashMap — From Zero to Dangerous
          </h1>
          {/* Progress */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 4, background: "#1a1b2e", borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  width: `${(completedCount / totalSections) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #7aa2f7, #bb9af7)",
                  borderRadius: 2,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
            <span style={{ fontSize: 13, color: "#7a7b9d" }}>
              {completedCount}/{totalSections}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 0, minHeight: "calc(100vh - 120px)" }}>
        {/* Sidebar */}
        <div style={{ width: 260, flexShrink: 0, borderRight: "1px solid #1e1f35", padding: "20px 0", overflowY: "auto" }}>
          {CHAPTERS.map((ch, ci) => (
            <div key={ch.id} style={{ marginBottom: 8 }}>
              <div
                onClick={() => { setActiveChapter(ci); setActiveSection(0); }}
                style={{
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: ci === activeChapter ? 700 : 500,
                  color: ci === activeChapter ? "#7aa2f7" : "#7a7b9d",
                  background: ci === activeChapter ? "#1a1b2e" : "transparent",
                  borderRight: ci === activeChapter ? "2px solid #7aa2f7" : "2px solid transparent",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18 }}>{ch.icon}</span>
                {ch.title}
              </div>
              {ci === activeChapter &&
                ch.sections.map((sec, si) => {
                  const done = completedSections[`${ci}-${si}`];
                  return (
                    <div
                      key={si}
                      onClick={() => setActiveSection(si)}
                      style={{
                        padding: "6px 20px 6px 52px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: si === activeSection ? "#c0caf5" : "#5a5b7d",
                        fontWeight: si === activeSection ? 600 : 400,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 10, color: done ? "#9ece6a" : "#3a3b5d" }}>{done ? "●" : "○"}</span>
                      {sec.title.length > 28 ? sec.title.slice(0, 28) + "…" : sec.title}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#5a5b7d", marginBottom: 8 }}>
            Chapter {activeChapter + 1} · Section {activeSection + 1}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#e0e0f0", margin: "0 0 24px 0", lineHeight: 1.3 }}>
            {section.title}
          </h2>

          {/* Content paragraphs */}
          <div style={{ fontSize: 15, lineHeight: 1.85, color: "#a9b1d6", whiteSpace: "pre-wrap", marginBottom: 20 }}>
            {section.content.split("\n").map((line, i) => {
              const boldMatch = line.match(/^\*\*(.*)\*\*$/);
              if (boldMatch) return <div key={i} style={{ fontWeight: 700, color: "#c0caf5", margin: "12px 0 4px" }}>{boldMatch[1]}</div>;
              const inlineBold = line.replace(/\*\*(.*?)\*\*/g, "«BOLD»$1«/BOLD»");
              const inlineCode = inlineBold.replace(/`(.*?)`/g, "«CODE»$1«/CODE»");
              const parts = inlineCode.split(/(«BOLD».*?«\/BOLD»|«CODE».*?«\/CODE»)/);
              return (
                <div key={i} style={{ marginBottom: 4 }}>
                  {parts.map((part, j) => {
                    if (part.startsWith("«BOLD»")) return <strong key={j} style={{ color: "#c0caf5" }}>{part.replace(/«\/?BOLD»/g, "")}</strong>;
                    if (part.startsWith("«CODE»")) return <code key={j} style={{ background: "#1a1b2e", padding: "2px 6px", borderRadius: 4, fontSize: 13, color: "#7aa2f7" }}>{part.replace(/«\/?CODE»/g, "")}</code>;
                    return <span key={j}>{part}</span>;
                  })}
                </div>
              );
            })}
          </div>

          {section.code && <CodeBlock code={section.code} />}
          {section.insight && <InsightBox text={section.insight} />}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 24, borderTop: "1px solid #1e1f35" }}>
            <button
              onClick={goBack}
              disabled={isFirst}
              style={{
                padding: "10px 24px",
                borderRadius: 6,
                border: "1px solid #2a2b4d",
                background: "transparent",
                color: isFirst ? "#3a3b5d" : "#7a7b9d",
                cursor: isFirst ? "default" : "pointer",
                fontSize: 14,
              }}
            >
              ← Previous
            </button>
            <button
              onClick={markComplete}
              style={{
                padding: "10px 32px",
                borderRadius: 6,
                border: "none",
                background: isLast ? "linear-gradient(135deg, #9ece6a, #7aa2f7)" : "linear-gradient(135deg, #7aa2f7, #bb9af7)",
                color: "#0f0f1a",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              {isLast ? "Complete! 🎉" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}