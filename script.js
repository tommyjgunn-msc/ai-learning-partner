// Firebase configuration - ONLY initialize once, here in script.js
const firebaseConfig = {
    apiKey: "AIzaSyAwFS_h6G8W19S02RCP5y-21XBanIDIzOQ",
    authDomain: "ai-learning-partner.firebaseapp.com",
    projectId: "ai-learning-partner",
    storageBucket: "ai-learning-partner.firebasestorage.app",
    messagingSenderId: "891144262835",
    appId: "1:891144262835:web:182b88ca5dfd57c8530cc6"
};

// Initialize Firebase v8 style (consistent with compat SDK)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Application configuration
const API_BASE_URL = 'https://ai-learning-partner-production.up.railway.app';

// Application state
let currentQuestionIndex = 0;
let conversationData = [];
let studentName = '';

// Learning reflection questions
const questions = [
    "How would you describe your energy levels and mental clarity this week?",
    "What moments this week made you feel most engaged or excited about learning?",
    "How did you handle any challenges or setbacks you encountered?",
    "Describe your interactions with classmates or study partners this week.",
    "What study strategies or approaches worked well for you this week?",
    "How does your current coursework connect to your personal goals or interests?",
    "When did you feel most confident in your abilities this week?",
    "What questions or topics sparked your curiosity beyond the required work?",
    "How did you manage stress or overwhelming moments this week?",
    "Looking back, what's one thing you learned about yourself as a learner this week?"
];

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI Learning Partner application started');
    console.log('Firebase initialized successfully');
    
    // Test Firebase connection
    db.enableNetwork().then(() => {
        console.log('Firebase Status: Connected');
    }).catch((error) => {
        console.error('Firebase Status: Error', error);
    });
    
    // Test API connection
    fetch(`${API_BASE_URL}/`)
        .then(response => response.json())
        .then(data => {
            console.log('API Status: Connected');
            console.log('API Response:', data.message);
        })
        .catch(error => {
            console.error('API Status: Error', error);
        });
    
    // Set up Enter key listener
    const userInput = document.getElementById('userInput');
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

// Start conversation function - MUST be global to work with onclick
function startConversation() {
    const nameInput = document.getElementById('studentName');
    studentName = nameInput.value.trim();
    
    if (!studentName) {
        alert('Please enter your name to begin.');
        nameInput.focus();
        return;
    }
    
    console.log('Starting conversation for:', studentName);
    
    // Reset conversation state
    currentQuestionIndex = 0;
    conversationData = [];
    
    // Hide login, show conversation
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('conversationSection').classList.remove('hidden');
    
    // Start with first question
    askQuestion();
}

function askQuestion() {
    const messageArea = document.getElementById('messageArea');
    const userInput = document.getElementById('userInput');
    const questionCounter = document.getElementById('questionCounter');
    const progressFill = document.getElementById('progressFill');
    
    if (currentQuestionIndex < questions.length) {
        const question = questions[currentQuestionIndex];
        
        // Update progress indicators
        questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
        progressFill.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
        
        // Add question to chat
        addMessage(`Question ${currentQuestionIndex + 1}: ${question}`, 'bot-message');
        
        // Focus input for better UX
        userInput.focus();
    } else {
        // All questions completed
        finishConversation();
    }
}

function sendMessage() {
    const userInput = document.getElementById('userInput');
    const answer = userInput.value.trim();
    
    if (!answer) {
        return;
    }
    
    console.log('User answered:', answer);
    
    // Display user's answer
    addMessage(answer, 'user-message');
    
    // Store the Q&A pair
    conversationData.push({
        question: questions[currentQuestionIndex],
        answer: answer
    });
    
    // Clear input
    userInput.value = '';
    
    // Move to next question
    currentQuestionIndex++;
    
    // Small delay before next question for better UX
    setTimeout(() => {
        askQuestion();
    }, 1000);
}

function addMessage(message, className) {
    const messageArea = document.getElementById('messageArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = message;
    messageArea.appendChild(messageDiv);
    messageArea.scrollTop = messageArea.scrollHeight;
}

async function finishConversation() {
    console.log('Finishing conversation, conversation data:', conversationData);
    
    // Hide conversation, show insights
    document.getElementById('conversationSection').classList.add('hidden');
    document.getElementById('insightsSection').classList.remove('hidden');
    
    // Save data and generate insights simultaneously
    await Promise.all([
        saveConversationData(),
        generateInsights()
    ]);
}

async function generateInsights() {
    const insightsContent = document.getElementById('insightsContent');
    
    // Show loading message with better styling
    insightsContent.innerHTML = `
        <div class="insights-card">
            <div class="insights-header">
                <h3>Analyzing Your Responses</h3>
                <div class="insights-subtitle">Generating personalized insights...</div>
            </div>
            <div class="loading">
                <div class="loading-animation">🤔</div>
                <p>Analyzing your learning patterns and creating personalized feedback...</p>
            </div>
        </div>
    `;
    
    try {
        console.log('Requesting AI analysis...');
        
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('AI analysis result:', result);
        
        if (result.success) {
            // Clear loading message
            insightsContent.innerHTML = '';
            
            // Clean up any remaining markdown formatting and apply proper HTML
            const cleanAnalysis = cleanupFormattingForDisplay(result.analysis);
            
            // Create insights card with improved formatting
            const insightsCard = document.createElement('div');
            insightsCard.className = 'insights-card';
            
            insightsCard.innerHTML = `
                <div class="insights-header">
                    <h3>Your Personalized Learning Insights</h3>
                    <div class="insights-subtitle">Based on your weekly reflection</div>
                </div>
                <div class="insights-content">
                    ${cleanAnalysis}
                </div>
                <div class="insights-footer">
                    <div class="model-attribution">
                        Insights generated by ${result.model_used || 'AI Assistant'} • 
                        Analysis completed ${new Date().toLocaleDateString()}
                    </div>
                </div>
            `;
            
            insightsContent.appendChild(insightsCard);
            
            // Add action buttons
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'insights-actions';
            actionsDiv.innerHTML = `
                <button onclick="resetConversation()" class="action-button primary">
                    Complete Check-in
                </button>
                <button onclick="exportPersonalReport()" class="action-button secondary">
                    Save My Report
                </button>
            `;
            insightsContent.appendChild(actionsDiv);
            
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
        
    } catch (error) {
        console.error('Error getting insights:', error);
        insightsContent.innerHTML = `
            <div class="insights-card error">
                <h3>Unable to Generate Insights</h3>
                <p>We encountered an issue analyzing your responses. Your answers have been saved, and you can try again later.</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <div class="insights-actions">
                    <button onclick="resetConversation()" class="action-button">Continue</button>
                </div>
            </div>
        `;
    }
}

function cleanupFormattingForDisplay(text) {
    return text
        // Replace any remaining markdown bold with HTML
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Replace any remaining markdown italic with HTML
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Replace bullet points with proper HTML
        .replace(/•\s*(.*?)(?=\n|$)/g, '<div class="insight-point">• $1</div>')
        .replace(/-\s*(.*?)(?=\n|$)/g, '<div class="insight-point">• $1</div>')
        // Replace double newlines with paragraph breaks
        .replace(/\n\n/g, '</p><p>')
        // Replace single newlines with line breaks
        .replace(/\n/g, '<br>')
        // Wrap content in paragraphs if not already
        .replace(/^(?!<)/g, '<p>')
        .replace(/(?<!>)$/g, '</p>')
        // Clean up any double paragraph tags
        .replace(/<p><\/p>/g, '')
        .replace(/<p>\s*<p>/g, '<p>')
        .replace(/<\/p>\s*<\/p>/g, '</p>');
}

async function saveConversationData() {
    try {
        console.log('Starting to save conversation data...');
        
        // First, extract performance markers with improved prompt
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
        console.log('Markers extraction result:', markersResult);
        
        // Prepare complete conversation record
        const conversationRecord = {
            studentName: studentName,
            timestamp: new Date().toISOString(),
            week: getWeekIdentifier(),
            responses: conversationData,
            performanceMarkers: markersResult.success ? markersResult.markers : {},
            completed: true
        };
        
        console.log('Saving conversation record:', conversationRecord);
        
        // Save to Firestore
        await db.collection('conversations').add(conversationRecord);
        console.log('Conversation saved to Firestore');
        
        // Also update student profile
        await updateStudentProfile(conversationRecord);
        console.log('Student profile updated');
        
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

function exportPersonalReport() {
    const reportData = {
        studentName: studentName,
        date: new Date().toLocaleDateString(),
        week: getWeekIdentifier(),
        responses: conversationData,
        analysisComplete: true
    };
    
    const reportText = `
Learning Reflection Report
Student: ${reportData.studentName}
Date: ${reportData.date}
Week: ${reportData.week}

RESPONSES:
${conversationData.map((item, index) => 
    `\n${index + 1}. ${item.question}\n   Answer: ${item.answer}`
).join('\n')}

Generated by AI Learning Partner
    `.trim();
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-reflection-${studentName}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function resetConversation() {
    console.log('Resetting conversation');
    
    // Reset everything for next week
    currentQuestionIndex = 0;
    conversationData = [];
    studentName = '';
    
    // Clear previous content
    document.getElementById('insightsContent').innerHTML = '';
    document.getElementById('messageArea').innerHTML = '';
    document.getElementById('studentName').value = '';
    
    // Reset progress indicators
    const questionCounter = document.getElementById('questionCounter');
    const progressFill = document.getElementById('progressFill');
    if (questionCounter) questionCounter.textContent = 'Question 1 of 10';
    if (progressFill) progressFill.style.width = '10%';
    
    // Show login again
    document.getElementById('insightsSection').classList.add('hidden');
    document.getElementById('conversationSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
}

// Helper function to get week identifier
function getWeekIdentifier() {
    const now = new Date();
    const year = now.getFullYear();
    const onejan = new Date(year, 0, 1);
    const week = Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return `${year}-week-${week}`;
}

// Make functions globally accessible for onclick handlers
window.startConversation = startConversation;
window.sendMessage = sendMessage;
window.resetConversation = resetConversation;
window.exportPersonalReport = exportPersonalReport;
