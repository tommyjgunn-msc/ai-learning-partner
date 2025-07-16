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
const MODEL_NAME = 'deepseek/deepseek-r1-0528:free'; // You can change this to any free model

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

// Add new endpoint for structured marker extraction
app.post('/extract-markers', async (req, res) => {
    try {
        const { conversationData, studentName } = req.body;
        
        const prompt = createMarkerExtractionPrompt(conversationData, studentName);
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an expert educational data analyst. Extract specific performance markers from student conversations and return structured JSON data."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 800,
            temperature: 0.3
        });
        
        const markersText = completion.choices[0].message.content;
        const markers = parseMarkersFromResponse(markersText);
        
        res.json({
            success: true,
            markers: markers,
            week: getWeekIdentifier()
        });
        
    } catch (error) {
        console.error('Error extracting markers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to extract performance markers'
        });
    }
});

function createMarkerExtractionPrompt(conversationData, studentName) {
    let prompt = `Extract performance markers from this student conversation:\n\nStudent: ${studentName}\n\n`;
    
    conversationData.forEach((item, index) => {
        prompt += `Q: ${item.question}\nA: ${item.answer}\n\n`;
    });
    
    prompt += `Rate each marker from 1-10 and provide evidence quote:

Performance Markers:
1. Cognitive Load (mental bandwidth available)
2. Social Integration (meaningful peer connections)
3. Intellectual Curiosity (engagement beyond requirements)
4. Identity Coherence (academic-personal integration)
5. Emotional Regulation (managing stress/setbacks)
6. Metacognitive Awareness (understanding own learning)
7. Purpose Alignment (connection to personal goals)
8. Resilience Building (growth from challenges)
9. Creative Problem-Solving (tackling novel challenges)
10. Narrative Coherence (coherent story about growth)
11. Micro-Recovery (energy management)
12. Intellectual Risk-Taking (engaging with uncertainty)

Return as JSON:
{
  "cognitive_load": {"score": X, "evidence": "quote"},
  "social_integration": {"score": X, "evidence": "quote"},
  ...
}`;

    return prompt;
}

function parseMarkersFromResponse(response) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error('Error parsing markers JSON:', error);
    }
    
    // Fallback: create basic structure
    return {
        cognitive_load: {score: 5, evidence: "Unable to extract specific evidence"},
        social_integration: {score: 5, evidence: "Unable to extract specific evidence"},
        intellectual_curiosity: {score: 5, evidence: "Unable to extract specific evidence"}
    };
}

function getWeekIdentifier() {
    const now = new Date();
    const year = now.getFullYear();
    const onejan = new Date(year, 0, 1);
    const week = Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return `${year}-week-${week}`;
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Using model: ${MODEL_NAME}`);
});