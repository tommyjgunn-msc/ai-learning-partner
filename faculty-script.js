const firebaseConfig = {
    apiKey: "AIzaSyAwFS_h6G8W19S02RCP5y-21XBanIDIzOQ",
    authDomain: "ai-learning-partner.firebaseapp.com",
    projectId: "ai-learning-partner",
    storageBucket: "ai-learning-partner.firebasestorage.app",
    messagingSenderId: "891144262835",
    appId: "1:891144262835:web:182b88ca5dfd57c8530cc6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let studentsData = [];
let conversationsData = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
});

async function loadDashboardData() {
    try {
        // Load students data
        const studentsSnapshot = await db.collection('students').get();
        studentsData = studentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load recent conversations
        const conversationsSnapshot = await db.collection('conversations')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        conversationsData = conversationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        updateDashboardStats();
        showOverview();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateDashboardStats() {
    // Calculate stats
    const totalStudents = studentsData.length;
    const thisWeek = getCurrentWeek();
    const thisWeekCheckins = conversationsData.filter(conv => 
        conv.week === thisWeek
    ).length;
    
    // Calculate students needing attention (simple algorithm for now)
    const needsAttention = studentsData.filter(student => {
        const recentConversations = conversationsData.filter(conv => 
            conv.studentName === student.studentName
        ).slice(0, 2);
        
        if (recentConversations.length === 0) return true; // No conversations
        
        // Check latest markers for concerning scores
        const latest = recentConversations[0];
        if (latest.performanceMarkers) {
            const lowScores = Object.values(latest.performanceMarkers).filter(marker => 
                marker.score && marker.score < 4
            );
            return lowScores.length >= 3; // 3 or more low scores
        }
        
        return false;
    }).length;

    // Update UI
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('thisWeekCheckins').textContent = thisWeekCheckins;
    document.getElementById('needsAttention').textContent = needsAttention;
}

function showOverview() {
    // Update navigation
    updateNavigation('overviewSection');
    
    const content = document.getElementById('overviewContent');
    content.innerHTML = '';
    
    // Engagement trends chart placeholder
    const trendsCard = createOverviewCard('Engagement Trends', 'Weekly participation and engagement metrics');
    content.appendChild(trendsCard);
    
    // Recent conversations
    const recentCard = createRecentConversationsCard();
    content.appendChild(recentCard);
    
    // Performance markers overview
    const markersCard = createMarkersOverviewCard();
    content.appendChild(markersCard);
}

function showStudentList() {
    updateNavigation('studentsSection');
    
    const content = document.getElementById('studentsContent');
    content.innerHTML = '';
    
    studentsData.forEach(student => {
        const studentCard = createStudentCard(student);
        content.appendChild(studentCard);
    });
}

function showInterventions() {
    updateNavigation('interventionsSection');
    
    const content = document.getElementById('interventionsContent');
    content.innerHTML = '';
    
    // Find students needing intervention
    const interventions = findStudentsNeedingIntervention();
    
    if (interventions.length === 0) {
        content.innerHTML = '<p>No students currently need intervention. Great job! 🎉</p>';
        return;
    }
    
    interventions.forEach(intervention => {
        const interventionItem = createInterventionItem(intervention);
        content.appendChild(interventionItem);
    });
}

function createStudentCard(student) {
    const card = document.createElement('div');
    card.className = 'student-card';
    
    // Get latest conversation
    const latestConversation = conversationsData
        .filter(conv => conv.studentName === student.studentName)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    
    // Determine status
    const status = getStudentStatus(student, latestConversation);
    
    card.innerHTML = `
        <div class="student-name">${student.studentName}</div>
        <div class="student-status">
            <div class="status-indicator status-${status.color}"></div>
            <span>${status.text}</span>
        </div>
        <div class="student-metrics">
            <span>Conversations: ${student.totalConversations || 0}</span>
            <span>Last: ${latestConversation ? formatDate(latestConversation.timestamp) : 'Never'}</span>
        </div>
        <button onclick="viewStudentDetails('${student.studentName}')" class="action-btn">View Details</button>
    `;
    
    return card;
}

function getStudentStatus(student, latestConversation) {
    if (!latestConversation) {
        return { color: 'red', text: 'No conversations' };
    }
    
    const daysSinceLastConversation = Math.floor(
        (new Date() - new Date(latestConversation.timestamp)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastConversation > 14) {
        return { color: 'red', text: 'Inactive' };
    }
    
    if (latestConversation.performanceMarkers) {
        const lowScores = Object.values(latestConversation.performanceMarkers).filter(marker => 
            marker.score && marker.score < 4
        );
        
        if (lowScores.length >= 3) {
            return { color: 'red', text: 'Needs attention' };
        } else if (lowScores.length >= 1) {
            return { color: 'yellow', text: 'Monitor' };
        }
    }
    
    return { color: 'green', text: 'Engaged' };
}

function createOverviewCard(title, description) {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
        <div class="student-name">${title}</div>
        <p>${description}</p>
    `;
    return card;
}

function createRecentConversationsCard() {
    const card = document.createElement('div');
    card.className = 'student-card';
    
    const recentConversations = conversationsData.slice(0, 5);
    
    let conversationsList = recentConversations.map(conv => 
        `<li>${conv.studentName} - ${formatDate(conv.timestamp)}</li>`
    ).join('');
    
    card.innerHTML = `
        <div class="student-name">Recent Conversations</div>
        <ul>${conversationsList}</ul>
    `;
    
    return card;
}

function createMarkersOverviewCard() {
    const card = document.createElement('div');
    card.className = 'student-card';
    
    // Calculate average scores across all recent conversations
    const recentConversations = conversationsData.filter(conv => 
        conv.performanceMarkers && Object.keys(conv.performanceMarkers).length > 0
    ).slice(0, 20);
    
    if (recentConversations.length === 0) {
        card.innerHTML = `
            <div class="student-name">Performance Markers</div>
            <p>No performance data available yet.</p>
        `;
        return card;
    }
    
    // Calculate averages
    const markerAverages = {};
    const markerNames = ['cognitive_load', 'social_integration', 'intellectual_curiosity'];
    
    markerNames.forEach(marker => {
        const scores = recentConversations
            .map(conv => conv.performanceMarkers[marker]?.score)
            .filter(score => score !== undefined);
        
        markerAverages[marker] = scores.length > 0 
            ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
            : 'N/A';
    });
    
    card.innerHTML = `
        <div class="student-name">Performance Markers Overview</div>
        <div class="student-metrics">
            <span>Cognitive Load: ${markerAverages.cognitive_load}</span>
            <span>Social Integration: ${markerAverages.social_integration}</span>
            <span>Curiosity: ${markerAverages.intellectual_curiosity}</span>
        </div>
    `;
    
    return card;
}

function findStudentsNeedingIntervention() {
    return studentsData.filter(student => {
        const latestConversation = conversationsData
            .filter(conv => conv.studentName === student.studentName)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        if (!latestConversation) {
            return {
                student: student,
                reason: 'No conversations completed',
                priority: 'high'
            };
        }
        
        const daysSinceLastConversation = Math.floor(
            (new Date() - new Date(latestConversation.timestamp)) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastConversation > 14) {
            return {
                student: student,
                reason: 'Inactive for more than 2 weeks',
                priority: 'high'
            };
        }
        
        if (latestConversation.performanceMarkers) {
            const lowScores = Object.values(latestConversation.performanceMarkers).filter(marker => 
                marker.score && marker.score < 4
            );
            
            if (lowScores.length >= 3) {
                return {
                    student: student,
                    reason: 'Multiple low performance indicators',
                    priority: 'medium'
                };
            }
        }
        
        return false;
    }).filter(Boolean);
}

function createInterventionItem(intervention) {
    const item = document.createElement('div');
    item.className = 'intervention-item';
    
    item.innerHTML = `
        <div class="intervention-student">${intervention.student.studentName}</div>
        <div class="intervention-reason">${intervention.reason}</div>
        <div class="intervention-actions">
            <button class="action-btn" onclick="viewStudentDetails('${intervention.student.studentName}')">View Details</button>
            <button class="action-btn" onclick="markContacted('${intervention.student.studentName}')">Mark as Contacted</button>
        </div>
    `;
    
    return item;
}

// Utility functions
function updateNavigation(activeSection) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show active section
    document.getElementById(activeSection).classList.remove('hidden');
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
}

function getCurrentWeek() {
    const now = new Date();
    const year = now.getFullYear();
    const onejan = new Date(year, 0, 1);
    const week = Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return `${year}-week-${week}`;
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString();
}

function refreshData() {
    loadDashboardData();
}

function viewStudentDetails(studentName) {
    alert(`Detailed view for ${studentName} - Coming in next phase!`);
}

function markContacted(studentName) {
    alert(`Marked ${studentName} as contacted`);
}

// Search functionality
document.getElementById('searchStudents').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const studentCards = document.querySelectorAll('#studentsContent .student-card');
    
    studentCards.forEach(card => {
        const studentName = card.querySelector('.student-name').textContent.toLowerCase();
        if (studentName.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});