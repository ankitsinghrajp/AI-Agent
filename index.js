import readlineSync from 'readline-sync';
import { GoogleGenerativeAI } from '@google/generative-ai';

const History = [];

const ai = new GoogleGenerativeAI('AIzaSyD2RoOZPTkZSQAgUKYM4hrcP1V9Q51suqQ'); // Replace with your actual API key

// 1. FUNCTIONS
function sum({ num1, num2 }) {
  return num1 + num2;
}

function prime({ num }) {
  if (num <= 1) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
}

async function getCryptoPrice({ coin }) {
  let response = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}`
  );
  const data = await response.json();
  return data[0]?.current_price ?? 'Not Found';
}

// 2. FUNCTION DECLARATIONS (schema must use lowercase types)
const sumDeclaration = {
  name: 'sum',
  description: 'Adds two numbers.',
  parameters: {
    type: 'object',
    properties: {
      num1: {
        type: 'number',
        description: 'First number to add.',
      },
      num2: {
        type: 'number',
        description: 'Second number to add.',
      },
    },
    required: ['num1', 'num2'],
  },
};

const primeDeclaration = {
  name: 'prime',
  description: 'Checks if a number is prime.',
  parameters: {
    type: 'object',
    properties: {
      num: {
        type: 'number',
        description: 'Number to check.',
      },
    },
    required: ['num'],
  },
};

const cryptoDeclaration = {
  name: 'getCryptoPrice',
  description: 'Fetches the current price of a cryptocurrency.',
  parameters: {
    type: 'object',
    properties: {
      coin: {
        type: 'string',
        description: 'Cryptocurrency name.',
      },
    },
    required: ['coin'],
  },
};

// 3. TOOL MAP
const availableTools = {
  sum: sum,
  prime: prime,
  getCryptoPrice: getCryptoPrice,
};

// 4. AGENT RUNNER
async function runAgent(userProblem) {
  History.push({
    role: 'user',
    parts: [{ text: userProblem }],
  });

  while (true) {
    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [
        {
          function_declarations: [
            sumDeclaration,
            primeDeclaration,
            cryptoDeclaration,
          ],
        },
      ],
    });

    const response = await model.generateContent({
      contents: History,
    });

    const candidate = response.response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (part?.functionCall) {
      const { name, args } = part.functionCall;
      const func = availableTools[name];

      // ✅ FIX: do NOT parse args if it's already an object
      const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

      const result = await func(parsedArgs);

      // Add functionCall response to history
      History.push({
        role: 'model',
        parts: [{ functionCall: part.functionCall }],
      });

      History.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name,
              response: { result },
            },
          },
        ],
      });
    } else {
      // Regular text response
      const text = part?.text ?? "No response.";
      History.push({
        role: 'assistant',
        parts: [{ text }],
      });
      console.log(text);
      break;
    }
  }
}

// 5. MAIN
async function main() {
  const userProblem = readlineSync.question('What problem would you like to solve? ');
  await runAgent(userProblem);
  main(); // recursively call again
}

main();
