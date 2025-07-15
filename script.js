const API_BASE_URL = 'ai-learning-partner-production.up.railway.app';

// Sample conversation questions - we'll make this smarter later
const conversationQuestions = [
    "How would you describe your energy levels this week when it comes to learning?",
    "What was the most interesting or engaging thing you learned this week?",
    "Did you face any challenges that made you want to give up? How did you handle them?",
    "How connected do you feel to your classmates and the learning community?",
    "What questions are you most curious about right now in your studies?",
    "How well do you feel you understood your own learning process this week?",
    "How aligned do your current studies feel with your personal goals and interests?",
    "When you encountered difficulties, how did you bounce back?",
    "Did you try any new approaches to learning or problem-solving this week?",
    "How would you summarize your overall learning story this week?"
];

let currentQuestionIndex = 0;
let conversationData = [];
let studentName = '';

function startConversation() {
    studentName = document.getElementById('studentName').value.trim();
    
    if (!studentName) {
        alert('Please enter your name to begin.');
        return;
    }
    
    // Hide login, show conversation
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('conversationSection').classList.remove('hidden');
    
    // Start first question
    askNextQuestion();
}

function askNextQuestion() {
    if (currentQuestionIndex < conversationQuestions.length) {
        const question = conversationQuestions[currentQuestionIndex];
        addMessage(question, 'ai-message');
        currentQuestionIndex++;
    } else {
        finishConversation();
    }
}

function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user-message');
    
    // Store the conversation data
    conversationData.push({
        question: conversationQuestions[currentQuestionIndex - 1],
        answer: message
    });
    
    // Clear input
    userInput.value = '';
    
    // Ask next question after a brief pause
    setTimeout(askNextQuestion, 1000);
}

function addMessage(message, className) {
    const messageArea = document.getElementById('messageArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = message;
    messageArea.appendChild(messageDiv);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function finishConversation() {
    // Hide conversation, show insights
    document.getElementById('conversationSection').classList.add('hidden');
    document.getElementById('insightsSection').classList.remove('hidden');
    
    // Generate basic insights (we'll make this AI-powered later)
    generateInsights();
}

async function generateInsights() {
    const insightsContent = document.getElementById('insightsContent');
    
    // Show loading message
    insightsContent.innerHTML = '<div class="insight-item">Analyzing your responses... 🤔</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/analyze-conversation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversationData: conversationData,
                studentName: studentName
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear loading message
            insightsContent.innerHTML = '';
            
            // Add AI-generated insights
            const analysisDiv = document.createElement('div');
            analysisDiv.className = 'insight-item';
            analysisDiv.innerHTML = `<h3>Your Learning Insights This Week</h3><p>${result.analysis}</p>`;
            
            // Optionally show which model was used
            if (result.model_used) {
                const modelInfo = document.createElement('div');
                modelInfo.className = 'model-info';
                modelInfo.style.fontSize = '0.8em';
                modelInfo.style.color = '#666';
                modelInfo.textContent = `Analysis powered by: ${result.model_used}`;
                analysisDiv.appendChild(modelInfo);
            }
            
            insightsContent.appendChild(analysisDiv);
            
        } else {
            throw new Error('Analysis failed');
        }
        
    } catch (error) {
        console.error('Error getting insights:', error);
        insightsContent.innerHTML = '<div class="insight-item">Sorry, we had trouble analyzing your responses. Please try again later.</div>';
    }
}

// Update saveConversationData function
async function saveConversationData() {
    try {
        // First, extract performance markers
        const markersResponse = await fetch(`${API_BASE_URL}/extract-markers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversationData: conversationData,
                studentName: studentName
            })
        });
        
        const markersResult = await markersResponse.json();
        
        // Prepare complete conversation record
        const conversationRecord = {
            studentName: studentName,
            timestamp: new Date().toISOString(),
            week: getWeekIdentifier(),
            responses: conversationData,
            performanceMarkers: markersResult.success ? markersResult.markers : {},
            completed: true
        };
        
        // Save to Firestore
        await db.collection('conversations').add(conversationRecord);
        
        // Also update student profile
        await updateStudentProfile(conversationRecord);
        
        console.log('Conversation saved successfully!');
        
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

async function updateStudentProfile(conversationRecord) {
    try {
        const studentProfileRef = db.collection('students').doc(studentName);
        
        // Check if profile exists
        const profileDoc = await studentProfileRef.get();
        
        if (profileDoc.exists) {
            // Update existing profile
            const currentData = profileDoc.data();
            const updatedProfile = {
                ...currentData,
                lastConversation: conversationRecord.timestamp,
                totalConversations: (currentData.totalConversations || 0) + 1,
                latestMarkers: conversationRecord.performanceMarkers
            };
            
            await studentProfileRef.update(updatedProfile);
        } else {
            // Create new profile
            const newProfile = {
                studentName: studentName,
                firstConversation: conversationRecord.timestamp,
                lastConversation: conversationRecord.timestamp,
                totalConversations: 1,
                latestMarkers: conversationRecord.performanceMarkers
            };
            
            await studentProfileRef.set(newProfile);
        }
        
    } catch (error) {
        console.error('Error updating student profile:', error);
    }
}

// Helper function to get week identifier
function getWeekIdentifier() {
    const now = new Date();
    const year = now.getFullYear();
    const onejan = new Date(year, 0, 1);
    const week = Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return `${year}-week-${week}`;
}

// Update the finishConversation function
function finishConversation() {
    // Save data before showing insights
    saveConversationData();
    
    // Hide conversation, show insights
    document.getElementById('conversationSection').classList.add('hidden');
    document.getElementById('insightsSection').classList.remove('hidden');
    
    // Generate basic insights
    generateInsights();
}

function resetConversation() {
    // Reset everything for next week
    currentQuestionIndex = 0;
    conversationData = [];
    studentName = '';
    
    // Clear previous insights
    document.getElementById('insightsContent').innerHTML = '';
    document.getElementById('messageArea').innerHTML = '';
    document.getElementById('studentName').value = '';
    
    // Show login again
    document.getElementById('insightsSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
}

// Allow Enter key to send messages
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});