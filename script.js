// CORRECTED: Fixed API URL with https://
const API_BASE_URL = 'https://ai-learning-partner-production.up.railway.app';

// Sample conversation questions
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
    
    // Reset conversation data
    conversationData = [];
    currentQuestionIndex = 0;
    
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
        // IMPORTANT: Call finishConversation when all questions are done
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
    
    console.log('Stored response:', conversationData[conversationData.length - 1]);
    
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

// CORRECTED: This function now properly calls both save and generate functions
async function finishConversation() {
    console.log('Finishing conversation with data:', conversationData);
    
    // Hide conversation, show insights
    document.getElementById('conversationSection').classList.add('hidden');
    document.getElementById('insightsSection').classList.remove('hidden');
    
    // Show loading message
    const insightsContent = document.getElementById('insightsContent');
    insightsContent.innerHTML = '<div class="insight-item">Processing your responses... 🤔</div>';
    
    try {
        // STEP 1: Save conversation data to database
        console.log('Step 1: Saving conversation data...');
        await saveConversationData();
        
        // STEP 2: Generate insights
        console.log('Step 2: Generating insights...');
        await generateInsights();
        
    } catch (error) {
        console.error('Error in finishConversation:', error);
        insightsContent.innerHTML = `
            <div class="insight-item">
                <h3>Processing Error</h3>
                <p>There was an issue processing your responses: ${error.message}</p>
                <p>Please check the console for details and try again.</p>
            </div>
        `;
    }
}

// CORRECTED: Enhanced saveConversationData function
async function saveConversationData() {
    try {
        console.log('Saving conversation data for:', studentName);
        console.log('Conversation data:', conversationData);
        
        // First, extract performance markers
        console.log('Extracting performance markers...');
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
        
        if (!markersResponse.ok) {
            throw new Error(`Markers API error: ${markersResponse.status}`);
        }
        
        const markersResult = await markersResponse.json();
        console.log('Markers result:', markersResult);
        
        // Prepare complete conversation record
        const conversationRecord = {
            studentName: studentName,
            timestamp: new Date().toISOString(),
            week: getWeekIdentifier(),
            responses: conversationData,
            performanceMarkers: markersResult.success ? markersResult.markers : {},
            completed: true
        };
        
        console.log('Saving to Firestore:', conversationRecord);
        
        // Save to Firestore
        const docRef = await db.collection('conversations').add(conversationRecord);
        console.log('Conversation saved with ID:', docRef.id);
        
        // Also update student profile
        await updateStudentProfile(conversationRecord);
        
        console.log('Conversation data saved successfully!');
        
    } catch (error) {
        console.error('Error saving conversation data:', error);
        throw error;
    }
}

// CORRECTED: Enhanced generateInsights function
async function generateInsights() {
    const insightsContent = document.getElementById('insightsContent');
    
    try {
        console.log('Generating insights for:', studentName);
        
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
        
        if (!response.ok) {
            throw new Error(`Analysis API error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Analysis result:', result);
        
        if (result.success) {
            // Clear loading message
            insightsContent.innerHTML = '';
            
            // Add AI-generated insights
            const analysisDiv = document.createElement('div');
            analysisDiv.className = 'insight-item';
            analysisDiv.innerHTML = `
                <h3>Your Learning Insights This Week</h3>
                <div class="analysis-content">${result.analysis}</div>
            `;
            
            // Show model info
            if (result.model_used) {
                const modelInfo = document.createElement('div');
                modelInfo.className = 'model-info';
                modelInfo.style.fontSize = '0.8em';
                modelInfo.style.color = '#666';
                modelInfo.style.marginTop = '10px';
                modelInfo.textContent = `Analysis powered by: ${result.model_used}`;
                analysisDiv.appendChild(modelInfo);
            }
            
            insightsContent.appendChild(analysisDiv);
            
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
        
    } catch (error) {
        console.error('Error generating insights:', error);
        insightsContent.innerHTML = `
            <div class="insight-item">
                <h3>Analysis Error</h3>
                <p>We had trouble analyzing your responses: ${error.message}</p>
                <p>Your data has been saved, but insights couldn't be generated.</p>
            </div>
        `;
    }
}

async function updateStudentProfile(conversationRecord) {
    try {
        console.log('Updating student profile for:', studentName);
        
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
            console.log('Student profile updated');
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
            console.log('New student profile created');
        }
        
    } catch (error) {
        console.error('Error updating student profile:', error);
        throw error;
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

// CORRECTED: Add event listener after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Allow Enter key to send messages
    const userInput = document.getElementById('userInput');
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Test API connection
    console.log('Testing API connection...');
    fetch(`${API_BASE_URL}/`)
        .then(response => response.json())
        .then(data => {
            console.log('API connection successful:', data);
        })
        .catch(error => {
            console.error('API connection failed:', error);
        });
});

// ADDED: Debug function to check current state
function debugCurrentState() {
    console.log('=== DEBUG STATE ===');
    console.log('Student Name:', studentName);
    console.log('Current Question Index:', currentQuestionIndex);
    console.log('Conversation Data:', conversationData);
    console.log('API Base URL:', API_BASE_URL);
    console.log('Firebase initialized:', typeof db !== 'undefined');
    console.log('==================');
}

// Make debug function available globally
window.debugCurrentState = debugCurrentState;