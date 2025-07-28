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
let isSaving = false; // Flag to prevent name clearing during save

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
    
    console.log('🎯 STARTING CONVERSATION FOR:', studentName);
    
    // Reset conversation state
    currentQuestionIndex = 0;
    conversationData = [];
    isSaving = false;
    
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
        if (questionCounter) questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
        if (progressFill) progressFill.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
        
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
    
    console.log('📝 USER ANSWERED:', answer);
    
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

// FIXED finishConversation - prevents race conditions
async function finishConversation() {
    console.log('🏁 FINISHING CONVERSATION FOR:', studentName);
    console.log('💾 Conversation data length:', conversationData.length);
    
    // CRITICAL: Set saving flag to prevent name clearing
    isSaving = true;
    
    // Hide conversation, show insights
    document.getElementById('conversationSection').classList.add('hidden');
    document.getElementById('insightsSection').classList.remove('hidden');
    
    // Save data FIRST, then generate insights
    try {
        await saveConversationData();
        console.log('✅ SAVE COMPLETED FOR:', studentName);
        await generateInsights();
        console.log('✅ INSIGHTS GENERATED FOR:', studentName);
    } catch (error) {
        console.error('❌ ERROR IN FINISH CONVERSATION:', error);
    } finally {
        // Clear saving flag
        isSaving = false;
    }
}

async function generateInsights() {
    const insightsContent = document.getElementById('insightsContent');
    
    // Preserve the student name for this operation
    const currentStudentName = studentName;
    console.log('🧠 GENERATING INSIGHTS FOR:', currentStudentName);
    
    // Show loading message with better styling
    insightsContent.innerHTML = `
        <div class="insights-card">
            <div class="insights-header">
                <h3>Analyzing Your Responses</h3>
                <div class="insights-subtitle">Generating personalized insights for ${currentStudentName}...</div>
            </div>
            <div class="loading">
                <div class="loading-animation">🤔</div>
                <p>Analyzing your learning patterns and creating personalized feedback...</p>
            </div>
        </div>
    `;
    
    try {
        console.log('🔍 REQUESTING AI ANALYSIS FOR:', currentStudentName);
        
        const response = await fetch(`${API_BASE_URL}/analyze-conversation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversationData: conversationData,
                studentName: currentStudentName // Use preserved name
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ AI ANALYSIS RESULT FOR:', currentStudentName, result);
        
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
                    <div class="insights-subtitle">Based on ${currentStudentName}'s weekly reflection</div>
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
        console.error('❌ ERROR GETTING INSIGHTS FOR:', currentStudentName, error);
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

// FIXED saveConversationData - preserves student name
async function saveConversationData() {
    // Capture the student name at the start to prevent it from being lost
    const savedStudentName = studentName;
    
    if (!savedStudentName) {
        console.error('❌ NO STUDENT NAME AVAILABLE FOR SAVING!');
        console.error('Current studentName variable:', studentName);
        console.error('Input field value:', document.getElementById('studentName')?.value);
        return;
    }
    
    try {
        console.log('💾 STARTING SAVE FOR:', savedStudentName);
        console.log('📊 Conversation data:', conversationData);
        
        // First, extract performance markers with improved prompt
        const markersResponse = await fetch(`${API_BASE_URL}/extract-markers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversationData: conversationData,
                studentName: savedStudentName // Use saved name
            })
        });
        
        if (!markersResponse.ok) {
            throw new Error(`Markers API error: ${markersResponse.status}`);
        }
        
        const markersResult = await markersResponse.json();
        console.log('🎯 MARKERS EXTRACTION RESULT FOR:', savedStudentName, markersResult);
        
        // Prepare complete conversation record
        const conversationRecord = {
            studentName: savedStudentName, // Use saved name
            timestamp: new Date().toISOString(),
            week: getWeekIdentifier(),
            responses: conversationData,
            performanceMarkers: markersResult.success ? markersResult.markers : {},
            completed: true
        };
        
        console.log('📝 SAVING CONVERSATION RECORD:', conversationRecord);
        
        // Save to Firestore
        const docRef = await db.collection('conversations').add(conversationRecord);
        console.log('✅ CONVERSATION SAVED TO FIRESTORE WITH ID:', docRef.id);
        console.log('👤 SAVED WITH STUDENT NAME:', conversationRecord.studentName);
        
        // Also update student profile
        await updateStudentProfile(conversationRecord, savedStudentName);
        console.log('✅ STUDENT PROFILE UPDATED FOR:', savedStudentName);
        
        console.log('🎉 CONVERSATION SAVED SUCCESSFULLY FOR:', savedStudentName);
        
    } catch (error) {
        console.error('❌ ERROR SAVING CONVERSATION FOR:', savedStudentName, error);
    }
}

// FIXED updateStudentProfile - uses passed student name
async function updateStudentProfile(conversationRecord, savedStudentName) {
    try {
        console.log('👤 UPDATING STUDENT PROFILE FOR:', savedStudentName);
        
        const studentProfileRef = db.collection('students').doc(savedStudentName);
        
        // Check if profile exists
        const profileDoc = await studentProfileRef.get();
        
        if (profileDoc.exists) {
            // Update existing profile
            const currentData = profileDoc.data();
            const updatedProfile = {
                ...currentData,
                studentName: savedStudentName, // Ensure name is set
                lastConversation: conversationRecord.timestamp,
                totalConversations: (currentData.totalConversations || 0) + 1,
                latestMarkers: conversationRecord.performanceMarkers
            };
            
            await studentProfileRef.update(updatedProfile);
            console.log('✅ UPDATED EXISTING PROFILE FOR:', savedStudentName);
        } else {
            // Create new profile
            const newProfile = {
                studentName: savedStudentName, // Ensure name is set
                firstConversation: conversationRecord.timestamp,
                lastConversation: conversationRecord.timestamp,
                totalConversations: 1,
                latestMarkers: conversationRecord.performanceMarkers
            };
            
            await studentProfileRef.set(newProfile);
            console.log('✅ CREATED NEW PROFILE FOR:', savedStudentName);
        }
        
    } catch (error) {
        console.error('❌ ERROR UPDATING STUDENT PROFILE FOR:', savedStudentName, error);
    }
}

function exportPersonalReport() {
    const currentStudentName = studentName || 'Unknown Student';
    
    const reportData = {
        studentName: currentStudentName,
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
    a.download = `learning-reflection-${currentStudentName}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// FIXED resetConversation - prevents clearing name during save
function resetConversation() {
    console.log('🔄 RESET CONVERSATION CALLED');
    console.log('💾 Is currently saving?', isSaving);
    console.log('👤 Current student name:', studentName);
    
    // Don't reset if we're still saving
    if (isSaving) {
        console.log('⏳ SAVE IN PROGRESS - DELAYING RESET');
        setTimeout(resetConversation, 1000);
        return;
    }
    
    console.log('✅ SAFE TO RESET - CLEARING DATA');
    
    // Reset everything for next week
    currentQuestionIndex = 0;
    conversationData = [];
    studentName = ''; // Now safe to clear
    isSaving = false;
    
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
    
    console.log('🏠 RESET COMPLETE - BACK TO LOGIN');
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
