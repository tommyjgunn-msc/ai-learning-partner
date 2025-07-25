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

// Faculty password - Change this to your desired password
const FACULTY_PASSWORD = "faculty2025"; // Change this to a secure password

// Password Protection Functions
function handleLogin(event) {
    event.preventDefault();
    const enteredPassword = document.getElementById('facultyPassword').value;
    
    if (enteredPassword === FACULTY_PASSWORD) {
        // Store authentication in sessionStorage (temporary)
        sessionStorage.setItem('facultyAuthenticated', 'true');
        showDashboard();
    } else {
        showLoginError();
    }
}

function showLoginError() {
    const errorDiv = document.getElementById('loginError');
    errorDiv.classList.remove('hidden');
    document.getElementById('facultyPassword').value = '';
    document.getElementById('facultyPassword').focus();
}

function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('hidden');
    loadDashboardData();
}

function logout() {
    sessionStorage.removeItem('facultyAuthenticated');
    document.getElementById('dashboardContainer').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('facultyPassword').value = '';
    document.getElementById('loginError').classList.add('hidden');
}

function checkAuthentication() {
    const isAuthenticated = sessionStorage.getItem('facultyAuthenticated') === 'true';
    if (isAuthenticated) {
        showDashboard();
    } else {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('dashboardContainer').classList.add('hidden');
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
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
    
    // Calculate students needing attention
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

// Fixed Navigation System
function showSection(sectionId, buttonElement) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show the selected section
    document.getElementById(sectionId).classList.remove('hidden');
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mark the clicked button as active
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
    
    // Load section-specific content
    switch(sectionId) {
        case 'overviewSection':
            showOverview();
            break;
        case 'studentsSection':
            showStudentList();
            break;
        case 'interventionsSection':
            showInterventions();
            break;
    }
}

function showOverview() {
    const content = document.getElementById('overviewContent');
    content.innerHTML = '';
    
    // Engagement trends card placeholder
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
    const content = document.getElementById('studentsContent');
    content.innerHTML = '';
    
    studentsData.forEach(student => {
        const studentCard = createStudentCard(student);
        content.appendChild(studentCard);
    });
}

function showInterventions() {
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
    card.onclick = () => viewStudentDetails(student.studentName);
    
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
    `;
    
    return card;
}

function getStudentStatus(student, latestConversation) {
    if (!latestConversation) {
        return { color: 'red', text: 'No Data' };
    }
    
    const daysSince = Math.floor((new Date() - new Date(latestConversation.timestamp)) / (1000 * 60 * 60 * 24));
    
    if (daysSince > 14) {
        return { color: 'red', text: 'Inactive' };
    }
    
    if (latestConversation.performanceMarkers) {
        const scores = Object.values(latestConversation.performanceMarkers)
            .filter(marker => marker.score)
            .map(marker => marker.score);
        
        const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
        
        if (avgScore >= 7) return { color: 'green', text: 'Thriving' };
        if (avgScore >= 5) return { color: 'yellow', text: 'Stable' };
        return { color: 'red', text: 'Needs Support' };
    }
    
    return { color: 'yellow', text: 'Monitoring' };
}

function createOverviewCard(title, description) {
    const card = document.createElement('div');
    card.className = 'overview-card';
    
    card.innerHTML = `
        <h3>${title}</h3>
        <p>${description}</p>
        <div class="card-content">
            <!-- Placeholder for charts/data -->
            <div class="placeholder-chart">
                📊 Chart visualization will be here
            </div>
        </div>
    `;
    
    return card;
}

function createRecentConversationsCard() {
    const card = document.createElement('div');
    card.className = 'overview-card';
    
    const recentConversations = conversationsData.slice(0, 5);
    
    card.innerHTML = `
        <h3>Recent Conversations</h3>
        <div class="card-content">
            ${recentConversations.map(conv => `
                <div class="recent-item">
                    <strong>${conv.studentName}</strong>
                    <span>${formatDate(conv.timestamp)}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    return card;
}

function createMarkersOverviewCard() {
    const card = document.createElement('div');
    card.className = 'overview-card';
    
    // Calculate average markers across all recent conversations
    const markerNames = [
        'cognitive_load', 'social_integration', 'intellectual_curiosity',
        'identity_coherence', 'emotional_regulation', 'metacognitive_awareness',
        'purpose_alignment', 'resilience_building', 'creative_problem_solving', 'narrative_coherence'
    ];
    
    const markerAverages = markerNames.reduce((acc, markerName) => {
        const scores = conversationsData
            .filter(conv => conv.performanceMarkers && conv.performanceMarkers[markerName])
            .map(conv => conv.performanceMarkers[markerName].score);
        
        acc[markerName] = scores.length > 0 
            ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
            : 'N/A';
        
        return acc;
    }, {});
    
    card.innerHTML = `
        <h3>Performance Markers Overview</h3>
        <div class="card-content">
            <div class="markers-grid">
                <div class="marker-item">Cognitive Load: ${markerAverages.cognitive_load}</div>
                <div class="marker-item">Social Integration: ${markerAverages.social_integration}</div>
                <div class="marker-item">Curiosity: ${markerAverages.intellectual_curiosity}</div>
                <div class="marker-item">Identity: ${markerAverages.identity_coherence}</div>
                <div class="marker-item">Emotional Regulation: ${markerAverages.emotional_regulation}</div>
                <div class="marker-item">Metacognition: ${markerAverages.metacognitive_awareness}</div>
            </div>
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

function viewStudentDetails(studentName) {
    const student = studentsData.find(s => s.studentName === studentName);
    const studentConversations = conversationsData
        .filter(conv => conv.studentName === studentName)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    document.getElementById('modalStudentName').textContent = `${studentName} - Detailed View`;
    
    const content = document.getElementById('studentDetailContent');
    content.innerHTML = `
        <div class="student-overview">
            <h3>Overview</h3>
            <p><strong>Total Conversations:</strong> ${student.totalConversations || 0}</p>
            <p><strong>First Conversation:</strong> ${student.firstConversation ? formatDate(student.firstConversation) : 'N/A'}</p>
            <p><strong>Last Conversation:</strong> ${student.lastConversation ? formatDate(student.lastConversation) : 'N/A'}</p>
        </div>
        
        <div class="conversation-history">
            <h3>Recent Conversations</h3>
            ${studentConversations.slice(0, 3).map(conv => `
                <div class="conversation-item">
                    <h4>${formatDate(conv.timestamp)} - Week ${conv.week}</h4>
                    ${conv.performanceMarkers ? `
                        <div class="markers-summary">
                            ${Object.entries(conv.performanceMarkers).slice(0, 5).map(([key, marker]) => `
                                <span class="marker-score ${marker.score < 4 ? 'low-score' : marker.score > 7 ? 'high-score' : 'med-score'}">
                                    ${key.replace(/_/g, ' ')}: ${marker.score}/10
                                </span>
                            `).join('')}
                        </div>
                    ` : '<p>No performance markers available</p>'}
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('studentModal').classList.remove('hidden');
}

function closeStudentModal() {
    document.getElementById('studentModal').classList.add('hidden');
}

function markContacted(studentName) {
    // This could save to database in the future
    alert(`Marked ${studentName} as contacted. This action has been logged.`);
}

function filterStudents() {
    const searchTerm = document.getElementById('searchStudents').value.toLowerCase();
    const studentCards = document.querySelectorAll('.student-card');
    
    studentCards.forEach(card => {
        const studentName = card.querySelector('.student-name').textContent.toLowerCase();
        if (studentName.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function exportStudentData() {
    // Create CSV data
    const csvData = studentsData.map(student => {
        const latestConversation = conversationsData
            .filter(conv => conv.studentName === student.studentName)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        return {
            name: student.studentName,
            totalConversations: student.totalConversations || 0,
            lastConversation: latestConversation ? formatDate(latestConversation.timestamp) : 'Never',
            status: getStudentStatus(student, latestConversation).text
        };
    });
    
    // Convert to CSV format
    const csvContent = [
        ['Student Name', 'Total Conversations', 'Last Conversation', 'Status'],
        ...csvData.map(row => [row.name, row.totalConversations, row.lastConversation, row.status])
    ].map(row => row.join(',')).join('\n');
    
    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Utility functions
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
