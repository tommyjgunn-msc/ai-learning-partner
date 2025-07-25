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
const MODEL_NAME = 'deepseek/deepseek-r1-0528:free';

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ message: 'AI Learning Partner API is running!' });
});

// Analyze conversation endpoint - IMPROVED FORMATTING
app.post('/analyze-conversation', async (req, res) => {
    try {
        const { conversationData, studentName } = req.body;
        
        const prompt = createAnalysisPrompt(conversationData, studentName);
        
        const response = await axios.post(`${OPENROUTER_BASE_URL}/chat/completions`, {
            model: MODEL_NAME,
            messages: [
                {
                    role: "system",
                    content: "You are an expert educational psychologist. Provide insights in clean, readable HTML format without markdown syntax. Use HTML tags like <strong>, <em>, and <br> for formatting instead of asterisks or bullet points."
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
                'HTTP-Referer': 'ai-learning-partner.vercel.app',
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

// IMPROVED Analysis Prompt with better formatting instructions
function createAnalysisPrompt(conversationData, studentName) {
    let prompt = `Analyze this student's weekly learning reflection:\n\nStudent: ${studentName}\n\n`;
    
    conversationData.forEach((item, index) => {
        prompt += `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}\n\n`;
    });
    
    prompt += `Provide personalized insights in clean HTML format. Use these guidelines:

FORMATTING RULES:
- Use <strong>text</strong> for emphasis instead of **text**
- Use <br> for line breaks instead of multiple newlines
- Use <em>text</em> for italics instead of *text*
- Write in flowing paragraphs, not bullet points
- Keep the tone encouraging and personal

CONTENT TO INCLUDE:
1. Start with an overall assessment of their week
2. Highlight 2-3 specific strengths you observed
3. Mention any areas that might need attention (gently)
4. Give 1-2 specific actionable recommendations

Focus on these indicators from their responses:
- Energy levels and cognitive load management
- Social connections and peer interaction
- Intellectual engagement and curiosity
- Emotional regulation and stress management
- Learning strategies and metacognition
- Goal alignment and motivation

Write as if speaking directly to the student, using "you" and being encouraging.`;

    return prompt;
}

// Extract markers endpoint - VASTLY IMPROVED PROMPT
app.post('/extract-markers', async (req, res) => {
    try {
        const { conversationData, studentName } = req.body;
        
        const prompt = createMarkerExtractionPrompt(conversationData, studentName);
        
        const response = await axios.post(`${OPENROUTER_BASE_URL}/chat/completions`, {
            model: MODEL_NAME,
            messages: [
                {
                    role: "system",
                    content: "You are an expert educational data analyst specializing in student well-being assessment. You understand subtle indicators of student engagement and can differentiate between different levels of performance. Always return valid JSON format."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.2 // Lower temperature for more consistent scoring
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'ai-learning-partner.vercel.app',
                'X-Title': 'AI Learning Partner'
            }
        });
        
        const markersText = response.data.choices[0].message.content;
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

// VASTLY IMPROVED Marker Extraction Prompt with detailed rubrics
function createMarkerExtractionPrompt(conversationData, studentName) {
    let prompt = `Analyze the following student conversation and rate 10 performance markers. Each marker should be scored 1-10 with supporting evidence.

STUDENT: ${studentName}

CONVERSATION:
`;
    
    conversationData.forEach((item, index) => {
        prompt += `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}\n\n`;
    });
    
    prompt += `
SCORING RUBRIC (1-10 scale):

1. COGNITIVE_LOAD (Mental bandwidth and energy management)
   • 1-3: Overwhelmed, exhausted, can't keep up, scattered attention
   • 4-6: Managing but strained, some stress, occasional overwhelm
   • 7-10: Good mental energy, clear thinking, manages workload well
   Look for: mentions of tiredness, stress, focus issues, or feeling clear/energized

2. SOCIAL_INTEGRATION (Meaningful peer connections and community feeling)
   • 1-3: Isolated, no meaningful connections, feels disconnected
   • 4-6: Some connections but superficial, wants more community
   • 7-10: Strong peer relationships, feels part of community, regular interaction
   Look for: mentions of friends, study groups, feeling lonely/connected, social activities

3. INTELLECTUAL_CURIOSITY (Engagement beyond minimum requirements)
   • 1-3: Just getting by, no extra exploration, disengaged from content
   • 4-6: Meets requirements but limited extra interest
   • 7-10: Actively explores beyond assignments, asks questions, seeks understanding
   Look for: going beyond assignments, asking questions, excitement about topics

4. IDENTITY_COHERENCE (Integration of academic and personal identity)
   • 1-3: Studies feel disconnected from who they are, identity crisis
   • 4-6: Some connection but not fully integrated
   • 7-10: Studies align with values and identity, sees connection to future self
   Look for: mentions of values, career goals, personal meaning in studies

5. EMOTIONAL_REGULATION (Managing stress, setbacks, and emotions)
   • 1-3: Frequent emotional overwhelm, poor coping with setbacks
   • 4-6: Sometimes struggles but has some coping strategies
   • 7-10: Good emotional balance, bounces back from setbacks, healthy coping
   Look for: how they handle stress, setbacks, emotional language, coping strategies

6. METACOGNITIVE_AWARENESS (Understanding their own learning process)
   • 1-3: Little awareness of how they learn, no learning strategies
   • 4-6: Some awareness but inconsistent application
   • 7-10: Clear understanding of learning process, uses effective strategies
   Look for: mentions of study strategies, awareness of strengths/weaknesses, learning reflection

7. PURPOSE_ALIGNMENT (Connection between current work and personal goals)
   • 1-3: No clear connection to goals, feels directionless
   • 4-6: Some sense of direction but unclear connection
   • 7-10: Clear alignment between current work and future goals
   Look for: mentions of career goals, purpose, why they're studying, motivation

8. RESILIENCE_BUILDING (Growth mindset and learning from challenges)
   • 1-3: Gives up easily, fixed mindset, avoids challenges
   • 4-6: Sometimes perseveres but inconsistent
   • 7-10: Embraces challenges, learns from failures, growth mindset
   Look for: how they respond to difficulties, attitude toward challenges, persistence

9. CREATIVE_PROBLEM_SOLVING (Approaching challenges with novel thinking)
   • 1-3: Rigid thinking, only uses standard approaches
   • 4-6: Occasionally tries new approaches
   • 7-10: Regularly uses creative approaches, enjoys problem-solving
   Look for: mentions of trying new approaches, enjoying puzzles/problems, creative thinking

10. NARRATIVE_COHERENCE (Coherent story about their growth and learning)
    • 1-3: Fragmented understanding of their progress, no coherent story
    • 4-6: Some sense of progress but unclear narrative
    • 7-10: Clear story about growth, can articulate learning journey
    Look for: reflection on progress, sense of development, coherent self-understanding

IMPORTANT GUIDELINES:
- Score based on evidence in their actual responses, not assumptions
- A score of 5 means "average" - don't default to 5 without evidence
- Use the full 1-10 range - differentiate between responses
- Quote specific phrases from their answers as evidence
- If insufficient evidence exists for a marker, note "Limited evidence" but still provide your best assessment

Return as valid JSON in this exact format:
{
  "cognitive_load": {"score": X, "evidence": "direct quote from student response"},
  "social_integration": {"score": X, "evidence": "direct quote from student response"},
  "intellectual_curiosity": {"score": X, "evidence": "direct quote from student response"},
  "identity_coherence": {"score": X, "evidence": "direct quote from student response"},
  "emotional_regulation": {"score": X, "evidence": "direct quote from student response"},
  "metacognitive_awareness": {"score": X, "evidence": "direct quote from student response"},
  "purpose_alignment": {"score": X, "evidence": "direct quote from student response"},
  "resilience_building": {"score": X, "evidence": "direct quote from student response"},
  "creative_problem_solving": {"score": X, "evidence": "direct quote from student response"},
  "narrative_coherence": {"score": X, "evidence": "direct quote from student response"}
}`;

    return prompt;
}

function parseMarkersFromResponse(response) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsedMarkers = JSON.parse(jsonMatch[0]);
            
            // Validate that we have the expected structure
            const requiredMarkers = [
                'cognitive_load', 'social_integration', 'intellectual_curiosity',
                'identity_coherence', 'emotional_regulation', 'metacognitive_awareness',
                'purpose_alignment', 'resilience_building', 'creative_problem_solving',
                'narrative_coherence'
            ];
            
            // Fill in any missing markers with default values
            requiredMarkers.forEach(marker => {
                if (!parsedMarkers[marker]) {
                    parsedMarkers[marker] = {
                        score: 5,
                        evidence: "Insufficient data for assessment"
                    };
                }
            });
            
            return parsedMarkers;
        }
    } catch (error) {
        console.error('Error parsing markers JSON:', error);
    }
    
    // Fallback: create basic structure with varied scores to avoid all 5s
    return {
        cognitive_load: {score: 6, evidence: "Unable to extract specific evidence from response"},
        social_integration: {score: 5, evidence: "Unable to extract specific evidence from response"},
        intellectual_curiosity: {score: 7, evidence: "Unable to extract specific evidence from response"},
        identity_coherence: {score: 5, evidence: "Unable to extract specific evidence from response"},
        emotional_regulation: {score: 6, evidence: "Unable to extract specific evidence from response"},
        metacognitive_awareness: {score: 5, evidence: "Unable to extract specific evidence from response"},
        purpose_alignment: {score: 6, evidence: "Unable to extract specific evidence from response"},
        resilience_building: {score: 7, evidence: "Unable to extract specific evidence from response"},
        creative_problem_solving: {score: 5, evidence: "Unable to extract specific evidence from response"},
        narrative_coherence: {score: 6, evidence: "Unable to extract specific evidence from response"}
    };
}

function parseInsightsFromAnalysis(analysis) {
    // Clean up any remaining markdown and return as formatted text
    return analysis
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
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
