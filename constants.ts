import { Question } from './types';

export const EXAM_CONTEXT = `
Context: You are applying for a full-stack developer role with a focus on AI technologies.
This assessment is designed to evaluate your foundational aptitude and your technical expertise across several key domains.

The assessment is divided into two distinct sections:
1.  **Aptitude & Reasoning:** A set of 20 questions to test your basic analytics, logical reasoning, and critical thinking skills.
2.  **Technical Assessment:** A series of questions covering Python, Deep Learning, Git, ReactJS, and AWS, including practical programming challenges.
`;

export const QUESTIONS: Question[] = [
  // SECTION 1 – Aptitude (20 Questions)
  {
    id: 'apt_1',
    section: 'Aptitude & Reasoning',
    title: '1. Number Series',
    text: 'Find the next number in the series: 5, 11, 23, 47, 95, ?',
    idealAnswerKey: '191. The pattern is to multiply the previous number by 2 and add 1 (5 * 2 + 1 = 11, 11 * 2 + 1 = 23, and so on).',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_2',
    section: 'Aptitude & Reasoning',
    title: '2. Coding-Decoding',
    text: "In a certain code, 'TEACHER' is written as 'VGCEJGT'. How is 'CHILDREN' written in that code?",
    idealAnswerKey: "'EJKNFTGP'. Each letter in the original word is moved forward by two positions in the alphabet.",
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_3',
    section: 'Aptitude & Reasoning',
    title: '3. Directions',
    text: 'A man is facing North. He turns 45 degrees in the clockwise direction and then another 180 degrees in the same direction and finally 45 degrees in the anti-clockwise direction. In which direction is he facing now?',
    idealAnswerKey: 'South. The net rotation is (45 + 180 - 45) = 180 degrees clockwise from North, which is South.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_4',
    section: 'Aptitude & Reasoning',
    title: '4. Blood Relations',
    text: 'If A is the brother of B, B is the sister of C, and C is the father of D, how is D related to A?',
    idealAnswerKey: "D is A's nephew or niece. The gender of D is not specified.",
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_5',
    section: 'Aptitude & Reasoning',
    title: '5. Speed and Distance',
    text: 'A car travels at a speed of 60 km/hr and covers a certain distance in 4 hours. To cover the same distance in 3 hours, what should be its speed?',
    idealAnswerKey: '80 km/hr. The total distance is 60 * 4 = 240 km. To cover 240 km in 3 hours, the speed must be 240 / 3 = 80 km/hr.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_6',
    section: 'Aptitude & Reasoning',
    title: '6. Analogy',
    text: 'Complete the analogy: Ship is to Sea as Camel is to _____?',
    idealAnswerKey: 'Desert. A ship is the primary mode of transport in the sea, just as a camel is in the desert.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_7',
    section: 'Aptitude & Reasoning',
    title: '7. Logical Deduction',
    text: 'Statement: All pens are books. All books are chairs. Conclusion I: Some pens are chairs. Conclusion II: Some chairs are books.',
    idealAnswerKey: 'Both conclusions are true. Since all pens are books and all books are chairs, it follows that all pens are chairs, so "some pens are chairs" is true. Also, since all books are chairs, it is true that "some chairs are books".',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_8',
    section: 'Aptitude & Reasoning',
    title: '8. Clocks',
    text: 'How many times in a day do the hands of a clock coincide?',
    idealAnswerKey: '22 times. The hands coincide 11 times every 12 hours.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_9',
    section: 'Aptitude & Reasoning',
    title: '9. Odd One Out',
    text: 'Find the odd one out: Lion, Tiger, Leopard, Cow.',
    idealAnswerKey: 'Cow. The others are wild, carnivorous animals, while the cow is a domestic, herbivorous animal.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_10',
    section: 'Aptitude & Reasoning',
    title: '10. Profit Percentage',
    text: 'A trader buys an article for $1200 and sells it for $1500. What is his profit percentage?',
    idealAnswerKey: '25%. The profit is $1500 - $1200 = $300. The profit percentage is (Profit / Cost Price) * 100 = (300 / 1200) * 100 = 25%.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_11',
    section: 'Aptitude & Reasoning',
    title: '11. Pattern Recognition',
    text: 'Identify the missing element in the pattern: J, F, M, A, M, ?, ?',
    idealAnswerKey: 'J, J. The letters are the first letter of the months of the year (January, February, March, April, May, June, July).',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_12',
    section: 'Aptitude & Reasoning',
    title: '12. Work and Time',
    text: 'If a project can be completed by 15 people in 20 days, how many days will it take for 25 people to complete the same project?',
    idealAnswerKey: '12 days. The total work is 15 * 20 = 300 person-days. With 25 people, it will take 300 / 25 = 12 days.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_13',
    section: 'Aptitude & Reasoning',
    title: '13. Ranking',
    text: 'In a row of students, Rohan is 7th from the left and 19th from the right. How many students are there in the row?',
    idealAnswerKey: '25. The total number of students is (7 + 19) - 1 = 25.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_14',
    section: 'Aptitude & Reasoning',
    title: '14. Clock Angles',
    text: 'What is the angle between the hour hand and the minute hand of a clock at 3:30?',
    idealAnswerKey: "75 degrees. At 3:30, the minute hand is at 6 (180°) and the hour hand is halfway between 3 and 4. The hour hand's position is (3.5 * 30°) = 105°. The difference is 180° - 105° = 75°.",
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_15',
    section: 'Aptitude & Reasoning',
    title: '15. Abstract Reasoning',
    text: 'Imagine a sequence of figures. Figure 1 is a square. In Figure 2, the square rotates 90 degrees clockwise and a dot appears in the top-left corner. In Figure 3, the square rotates another 90 degrees clockwise, and the dot moves to the next corner clockwise. Describe Figure 4.',
    idealAnswerKey: 'Figure 4 would be a square that has rotated a total of 270 degrees clockwise from the start (or 90 degrees anti-clockwise). The dot would be in the bottom-left corner.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_16',
    section: 'Aptitude & Reasoning',
    title: '16. Logical Puzzle',
    text: "If 'Cloud' is called 'White', 'White' is called 'Rain', 'Rain' is called 'Green', 'Green' is called 'Air', where do birds fly?",
    idealAnswerKey: "Green. Birds fly in the 'Air', but 'Air' is called 'Green'.",
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_17',
    section: 'Aptitude & Reasoning',
    title: '17. Set Theory',
    text: 'A survey of 100 people showed that 72 people speak English and 43 people speak French. How many speak both English and French?',
    idealAnswerKey: '15. Total = English + French - Both. 100 = 72 + 43 - Both. Both = 115 - 100 = 15.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_18',
    section: 'Aptitude & Reasoning',
    title: '18. Averages',
    text: 'The average of five numbers is 27. If one number is excluded, the average becomes 25. What is the excluded number?',
    idealAnswerKey: '35. The sum of the five numbers is 5 * 27 = 135. The sum of the remaining four numbers is 4 * 25 = 100. The excluded number is 135 - 100 = 35.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_19',
    section: 'Aptitude & Reasoning',
    title: '19. Probability',
    text: "What is the probability of getting a 'king' from a standard deck of 52 playing cards?",
    idealAnswerKey: '1/13. There are 4 kings in a 52-card deck. The probability is 4/52, which simplifies to 1/13.',
    codeType: 'text',
    marks: 5,
  },
  {
    id: 'apt_20',
    section: 'Aptitude & Reasoning',
    title: '20. Critical Thinking',
    text: 'A company implemented a new "work from home" policy, and in the following quarter, productivity increased by 15%. Can we conclude the policy was the sole cause of the increase? What other factors might be at play?',
    idealAnswerKey: 'No, we cannot conclude it was the sole cause. Correlation does not imply causation. Other factors could include a seasonal business upswing, the launch of a new successful product, improved employee morale from other initiatives, or the completion of a long, resource-intensive project in the previous quarter.',
    codeType: 'text',
    marks: 5,
  },
  // SECTION 2 – Technical Assessment
  {
    id: 'tech_py_1',
    section: 'Technical Assessment',
    title: '21. Python Global Interpreter Lock (GIL)',
    text: 'What is the Global Interpreter Lock (GIL) in Python, and how does it affect multithreaded programs?',
    idealAnswerKey: 'The GIL is a mutex that protects access to Python objects, preventing multiple native threads from executing Python bytecodes at the same time. This means that even on a multi-core processor, only one thread can be executing Python code at any given moment. It simplifies memory management but limits the performance of CPU-bound multithreaded programs. It is less of an issue for I/O-bound programs, which can still benefit from threading.',
    codeType: 'text',
    marks: 10,
  },
  {
    id: 'tech_py_2',
    section: 'Technical Assessment',
    title: '22. List vs. Tuple',
    text: 'Explain the difference between a list and a tuple in Python. When would you use one over the other?',
    idealAnswerKey: 'The primary difference is that lists are mutable (can be changed after creation), while tuples are immutable (cannot be changed). You would use a list when you need a collection of items that might need to be modified, such as adding, removing, or changing elements. You would use a tuple for a collection of items that should not change, such as coordinates, configuration settings, or as keys in a dictionary.',
    codeType: 'text',
    marks: 10,
  },
  {
    id: 'tech_dl_1',
    section: 'Technical Assessment',
    title: '23. Overfitting',
    text: 'What is "overfitting" in the context of a machine learning model, and name two techniques to prevent it.',
    idealAnswerKey: 'Overfitting occurs when a model learns the training data too well, including its noise and random fluctuations, to the point that it performs poorly on new, unseen data. Two common techniques to prevent overfitting are: 1) Regularization (like L1/L2), which adds a penalty to the loss function for large weights. 2) Dropout, which randomly sets a fraction of neuron activations to zero during training to force the network to learn more robust features. Other valid answers include data augmentation and early stopping.',
    codeType: 'text',
    marks: 10,
  },
  {
    id: 'tech_dl_2',
    section: 'Technical Assessment',
    title: '24. Activation Functions',
    text: 'What is an activation function in a neural network, and why is it important? Name one common activation function.',
    idealAnswerKey: "An activation function is a function applied to the output of a neuron (or a layer of neurons) that determines whether it should be activated or not. It is important because it introduces non-linearity into the model, allowing it to learn complex patterns and relationships in the data. Without non-linear activation functions, a deep neural network would behave like a single-layer linear model. A common activation function is ReLU (Rectified Linear Unit).",
    codeType: 'text',
    marks: 10,
  },
  {
    id: 'tech_git_1',
    section: 'Technical Assessment',
    title: '25. Git Merge vs. Rebase',
    text: 'Explain the difference between `git merge` and `git rebase`.',
    idealAnswerKey: 'Both are used to integrate changes from one branch into another. `git merge` creates a new "merge commit" in the target branch that ties the histories of the two branches together, preserving the original commit history. `git rebase` moves or "re-plays" the entire feature branch on top of the target branch, creating a linear history without an extra merge commit, which can be cleaner but rewrites the project history.',
    codeType: 'text',
    marks: 10,
  },
  {
    id: 'tech_git_2',
    section: 'Technical Assessment',
    title: '26. Git Stash',
    text: 'What does the `git stash` command do and in what scenario is it useful?',
    idealAnswerKey: "`git stash` temporarily shelves (or stashes) changes you've made to your working directory so you can work on something else, and then come back and re-apply them later. It's useful when you are in the middle of working on a feature but need to switch branches to fix an urgent bug without committing your incomplete work.",
    codeType: 'text',
    marks: 10,
  },
  {
    id: 'tech_react_1',
    section: 'Technical Assessment',
    title: '27. useEffect Hook',
    text: 'What is the purpose of the `useEffect` hook in React? Provide an example of its usage.',
    idealAnswerKey: "The `useEffect` hook lets you perform side effects in function components. Side effects are operations that can affect other components and can't be done during rendering, such as data fetching, setting up a subscription, or manually changing the DOM. An example would be fetching user data from an API when the component mounts: `useEffect(() => { fetchUserData(userId); }, [userId]);`. The dependency array `[userId]` ensures the effect re-runs only if `userId` changes.",
    codeType: 'text',
    marks: 10,
  },
  {
    id: 'tech_react_2',
    section: 'Technical Assessment',
    title: '28. State vs. Props',
    text: 'What is the difference between state and props in React?',
    idealAnswerKey: "`props` (properties) are read-only and are passed down from a parent component to a child component to pass data and configuration. `state` is a local data store for a component that is private and fully controlled by that component. When a component's state changes, the component re-renders. State is mutable, whereas props are not.",
    codeType: 'text',
    marks: 10,
  },
  {
    id: 'tech_aws_1',
    section: 'Technical Assessment',
    title: '29. EC2 vs. Lambda',
    text: 'Explain the difference between AWS EC2 and AWS Lambda. When would you choose one over the other?',
    idealAnswerKey: "EC2 (Elastic Compute Cloud) provides virtual servers (instances) where you have full control over the operating system and environment. It runs continuously and is billed by the hour or second. Lambda is a serverless compute service that runs your code in response to events. You only pay for the compute time you consume, and you don't manage any servers. You would choose EC2 for long-running applications, traditional web servers, or when you need fine-grained control over the environment. You would choose Lambda for short-lived, event-driven tasks, microservices, or backend APIs where you want to pay only for execution time.",
    codeType: 'text',
    marks: 10,
  },
  {
    id: 'tech_aws_2',
    section: 'Technical Assessment',
    title: '30. IAM Roles',
    text: 'What is an IAM Role in AWS, and why is it more secure than using access keys?',
    idealAnswerKey: "An IAM Role is an identity with permission policies that determine what the identity can and cannot do in AWS. Unlike a user, a role does not have its own long-term credentials like a password or access keys. Instead, when an entity (like an EC2 instance or Lambda function) assumes a role, it gets temporary security credentials. This is more secure because it avoids embedding long-lived, static access keys in your application code, which could be accidentally exposed. Roles provide an automatic and secure way to manage credentials for services.",
    codeType: 'text',
    marks: 10,
  },
  {
    id: 'tech_py_prog_1',
    section: 'Technical Assessment',
    title: '31. Find Most Frequent Element',
    text: 'Write a Python function that takes a list of integers as input and returns the most frequently occurring element. If there is a tie, return any of the most frequent elements.',
    idealAnswerKey: `
def find_most_frequent(numbers):
    if not numbers:
        return None
    counts = {}
    for num in numbers:
        counts[num] = counts.get(num, 0) + 1
    most_frequent_element = max(counts, key=counts.get)
    return most_frequent_element

# Explanation: The function uses a dictionary to count frequencies. It then uses max() with a custom key to find the element with the highest count.`,
    codeType: 'python',
    marks: 20,
  },
  {
    id: 'tech_py_prog_2',
    section: 'Technical Assessment',
    title: '32. Palindrome Check',
    text: 'Write a Python function `is_palindrome(s)` that checks if a given string is a palindrome. The function should be case-insensitive and should ignore all non-alphanumeric characters (spaces, punctuation, etc.).',
    idealAnswerKey: `
import re

def is_palindrome(s):
    normalized_s = re.sub(r'[^a-z0-9]', '', s.lower())
    return normalized_s == normalized_s[::-1]

# Explanation: The function normalizes the string by converting to lowercase and removing non-alphanumeric characters with a regex. Then it checks if the string is equal to its reverse.`,
    codeType: 'python',
    marks: 20,
  }
];