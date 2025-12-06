#!/usr/bin/env node

/**
 * Script de test simple pour tester l'API RésonancIA
 * Usage: node test-api.js
 */

const handler = require('./api/echo.js');

// Mock req/res pour tester
function createMockRequest(body, method = 'POST') {
  let data = '';
  return {
    method,
    url: '/api/echo',
    on: function(event, callback) {
      if (event === 'data') {
        setTimeout(() => callback(Buffer.from(JSON.stringify(body))), 10);
      } else if (event === 'end') {
        setTimeout(callback, 20);
      }
    }
  };
}

function createMockResponse() {
  let statusCode = 200;
  let body = '';
  let headers = {};
  
  return {
    writeHead(code, h) {
      statusCode = code;
      headers = h;
    },
    setHeader(k, v) {
      headers[k] = v;
    },
    end(data) {
      body = data;
      console.log('\n📤 Réponse reçue:');
      console.log('Status:', statusCode);
      console.log('Body:');
      try {
        console.log(JSON.stringify(JSON.parse(body), null, 2));
      } catch {
        console.log(body);
      }
      process.exit(0);
    }
  };
}

// Tests
const tests = [
  {
    name: 'Test 1: Mode neutral (défaut)',
    body: { message: 'Je cherche du sens dans ce monde complexe' }
  },
  {
    name: 'Test 2: Mode hypno',
    body: { message: 'Je cherche du sens dans ce monde complexe', mode: 'hypno' }
  },
  {
    name: 'Test 3: Mode ado',
    body: { message: 'C\'est trop cool ce truc ouf!', mode: 'ado' }
  },
  {
    name: 'Test 4: Mode etp',
    body: { message: 'J\'aime apprendre et découvrir', mode: 'etp' }
  },
  {
    name: 'Test 5: Sans mémoire',
    body: { message: 'Test anonyme', disableMemory: true }
  }
];

// Exécute un test
let currentTest = parseInt(process.argv[2]) || 0;

if (currentTest >= tests.length) {
  console.log('\n✅ Tous les tests peuvent être exécutés!');
  console.log('Usage: node test-api.js [0-4]\n');
  tests.forEach((t, i) => {
    console.log(`  node test-api.js ${i}   # ${t.name}`);
  });
  process.exit(0);
}

const test = tests[currentTest];
console.log(`\n🧪 ${test.name}`);
console.log('📥 Requête:');
console.log(JSON.stringify(test.body, null, 2));

const req = createMockRequest(test.body);
const res = createMockResponse();

handler(req, res);
