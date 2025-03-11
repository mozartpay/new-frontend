import { testCarbonSink } from './carbon-sink.test';

async function runTest() {
  try {
    await testCarbonSink();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
