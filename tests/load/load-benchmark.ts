import autocannon from 'autocannon';

async function run() {
  console.log('Testing http://localhost:5000/api/health under 50 concurrent connections...');
  const result = await autocannon({
    url: 'http://localhost:5000/api/health',
    connections: 50,
    duration: 5,
    headers: { 'content-type': 'application/json' },
  });

  console.log(`Avg Requests/Sec: ${result.requests.average}`);
  console.log(`Latency p50:      ${result.latency.p50} ms`);
  console.log(`Latency p99:      ${result.latency.p99} ms`);
  console.log(`2xx Responses:    ${result['2xx']}`);
  console.log(`Errors:           ${result.errors}`);
}

run();
