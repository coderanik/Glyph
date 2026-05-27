/**
 * Glyph Compilation Integration Test Script
 * This script tests the full flow of creating a project, writing a main.tex file,
 * triggering Docker LaTeX compilation, and polling for the job status.
 * 
 * Run using: node test_compilation.cjs
 */

const http = require('http');

const API_BASE = 'http://localhost:8083';
const MOCK_USER = 'local-test-developer';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-User': MOCK_USER,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Request to ${path} failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Starting Glyph LaTeX Compilation integration test...');
  
  try {
    // 1. Create a project
    console.log('\n1. Creating project...');
    const project = await request('POST', '/projects', { name: 'Integration Test Project' });
    const projectId = project.id;
    console.log(`✅ Project created successfully! ID: ${projectId}`);

    // 2. Create main.tex file
    console.log('\n2. Creating main.tex...');
    const mainTexContent = `\\documentclass{article}
\\begin{document}
\\title{Integration Test Document}
\\author{Glyph test suite}
\\maketitle
\\section{Introduction}
Hello from the Glyph integration test suite compiling inside Docker!
\\end{document}
`;
    const file = await request('POST', `/projects/${projectId}/files`, {
      name: 'main.tex',
      path: 'main.tex',
      content: mainTexContent,
    });
    console.log(`✅ main.tex created successfully! File ID: ${file.id}`);

    // 3. Trigger compilation
    console.log('\n3. Triggering LaTeX compilation...');
    const compileResult = await request('POST', `/projects/${projectId}/compile`);
    const jobId = compileResult.job_id;
    console.log(`✅ Compilation job triggered! Job ID: ${jobId}`);

    // 4. Poll status
    console.log('\n4. Polling compilation job status...');
    let attempts = 0;
    const maxAttempts = 100;
    let jobStatus = null;

    while (attempts < maxAttempts) {
      jobStatus = await request('GET', `/projects/${projectId}/jobs/${jobId}`);
      console.log(`   [Attempt ${attempts + 1}] Status: ${jobStatus.status}`);
      
      if (jobStatus.status === 'success' || jobStatus.status === 'failed') {
        break;
      }
      
      attempts++;
      await sleep(1000);
    }

    console.log('\n=== COMPILATION RESULT ===');
    console.log(`Status: ${jobStatus.status}`);
    console.log(`PDF URL: ${jobStatus.pdf_url || 'N/A'}`);
    console.log('\n=== COMPILER LOGS ===');
    console.log(jobStatus.logs);
    console.log('======================');

    if (jobStatus.status === 'success') {
      console.log('🎉 Integration test PASSED successfully!');
    } else {
      console.log('❌ Integration test FAILED. Check the compiler logs above.');
    }

  } catch (err) {
    console.error('❌ Integration test failed with error:', err.message);
  }
}

// Check if server is running first, then run test
const checkReq = http.get(`${API_BASE}/`, (res) => {
  runTest();
});
checkReq.on('error', () => {
  console.error(`❌ Error: The Hono server is not running on ${API_BASE}. Please run "npm run dev" in the server directory first.`);
});
