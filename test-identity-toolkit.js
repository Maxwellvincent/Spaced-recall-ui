// test-identity-toolkit.js - Test the Identity Toolkit API directly
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

console.log('Testing Identity Toolkit API access...');

// Get API key from environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
console.log('API Key (first 5 chars):', apiKey ? apiKey.substring(0, 5) + '...' : 'Not set');

// Try to ensure API key is properly formatted as a string
const formattedApiKey = String(apiKey).trim();

// Construct the URL that's failing
const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${formattedApiKey}`;
console.log('Testing URL:', url.replace(formattedApiKey, formattedApiKey.substring(0, 5) + '...'));

// Make the request
console.log('\nMaking request to Identity Toolkit API...');
fetch(url)
  .then(response => {
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    
    if (response.ok) {
      return response.json().then(data => {
        console.log('Success! API responded with:', data);
      });
    } else {
      return response.text().then(text => {
        console.error('Error response:', text);
        
        console.log('\nPossible issues:');
        console.log('1. The API key may not have permission to use the Identity Toolkit API');
        console.log('2. The Identity Toolkit API may not be enabled for your project');
        console.log('3. The API key may have domain restrictions that prevent its use from your current environment');
        
        console.log('\nRecommendations:');
        console.log('1. Go to Google Cloud Console > APIs & Services > Credentials');
        console.log('2. Find your API key and check its restrictions');
        console.log('3. Make sure "Identity Toolkit API" is in the list of allowed APIs');
        console.log('4. Go to APIs & Services > Library and enable the Identity Toolkit API if needed');
        console.log('5. If using domain restrictions, make sure your current domain is allowed');
      });
    }
  })
  .catch(error => {
    console.error('Network error:', error);
  }); 