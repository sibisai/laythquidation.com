require('dotenv').config();
const OpenAI = require('openai');


const openai = new OpenAI({
  apiKey: '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'
});

const generateRoute = async (origin, selectedLocations) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a travel route planner that provides routes in JSON format.' },
        { role: 'user', content: `Create an efficient travel route based on these addresses: ${JSON.stringify(selectedLocations)}. The route should start and end at ${origin}. Please provide the route as a JSON object with the following format: {"route": [{"step": 1, "address": "address1"}, {"step": 2, "address": "address2"}, ... {"step": n, "address": "addressN"}]}` },
      ],
    });

    if (response && response.choices && response.choices.length > 0) {
      const routeText = response.choices[0].message.content;

      const jsonStartIndex = routeText.indexOf('{');
      const jsonEndIndex = routeText.lastIndexOf('}') + 1;
      const jsonString = routeText.slice(jsonStartIndex, jsonEndIndex);
      console.log('raw json string:', jsonString);
      const route = JSON.parse(jsonString);
      return route;
    } else {
      throw new Error('Invalid response format from OpenAI API');
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error('API error:', error.status, error.message, error.code, error.type);
    } else {
      console.error('Non-API error:', error);
    }
    throw error;
  }
};

module.exports = {
  generateRoute,
};
