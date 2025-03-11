import { requestCarbonSink } from '~/utils/api';

async function testCarbonSink() {
  const testData = {
    xlmAddress: 'GBXGQJWVLWOYHFLVTKWV5FGHA3LNYY2JQKM7OAJAUEQFU6LPCSEFVXON', // Example Stellar address
    carbonAmount: '100',  // Example carbon amount
    usdcAmount: '10',     // Example USDC amount
    email: 'test@example.com',
    token: 'your_test_token',
    apiUrl: 'https://mozart-api-21ea5fd801a8.herokuapp.com/api'
  };

  try {
    console.log('Testing carbon sink with data:', testData);
    const response = await requestCarbonSink(
      testData.xlmAddress,
      testData.carbonAmount,
      testData.usdcAmount,
      testData.email,
      testData.token,
      testData.apiUrl
    );
    console.log('Carbon sink response:', response);
    return response;
  } catch (error) {
    console.error('Carbon sink test failed:', error);
    throw error;
  }
}

export { testCarbonSink };
