const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Choose your preferred free model here
const MODEL_NAME = 'google/gemini-2.5-pro-exp-03-25'; // You can change this to any free model

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ message: 'AI Learning Partner API is running!' });
});

// Analyze conversation endpoint
app.post('/analyze-conversation', async (req, res) => {
    try {
        const { conversationData, studentName } = req.body;
        
        const prompt = createAnalysisPrompt(conversationData, studentName);
        
        const response = await axios.post(`${OPENROUTER_BASE_URL}/chat/completions`, {
            model: MODEL_NAME,
            messages: [
                {
                    role: "system",
                    content: "You are an expert educational psychologist analyzing student learning patterns. Provide specific, actionable insights based on the conversation data."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'ai-learning-partner.vercel.app', // Replace with your domain
                'X-Title': 'AI Learning Partner'
            }
        });
        
        const analysis = response.data.choices[0].message.content;
        
        res.json({
            success: true,
            analysis: analysis,
            insights: parseInsightsFromAnalysis(analysis),
            model_used: MODEL_NAME
        });
        
    } catch (error) {
        console.error('Error analyzing conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze conversation',
            details: error.response?.data || error.message
        });
    }
});

function createAnalysisPrompt(conversationData, studentName) {
    let prompt = `Analyze this student's weekly learning reflection:\n\nStudent: ${studentName}\n\n`;
    
    conversationData.forEach((item, index) => {
        prompt += `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}\n\n`;
    });
    
    prompt += `Based on these responses, provide:
1. 3-4 specific insights about their learning patterns
2. Areas of strength to build on
3. Potential concerns or areas needing support
4. Actionable recommendations for next week

Focus on these key indicators:
- Cognitive load and mental bandwidth
- Intellectual curiosity and engagement
- Emotional regulation and resilience
- Social integration and connection
- Metacognitive awareness
- Purpose alignment

Provide encouraging but honest feedback that helps them grow.`;

    return prompt;
}

function parseInsightsFromAnalysis(analysis) {
    // Simple parsing - you can make this more sophisticated
    const insights = analysis.split('\n').filter(line => 
        line.trim().length > 10 && 
        (line.includes('•') || line.includes('-') || line.includes('1.') || line.includes('2.'))
    );
    
    return insights.slice(0, 5); // Return top 5 insights
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Using model: ${MODEL_NAME}`);
});