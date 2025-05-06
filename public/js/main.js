// Common JavaScript functions
document.addEventListener('DOMContentLoaded', function() {
  // Update navigation based on authentication status
  updateNavigation();
});

function updateNavigation() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (user) {
    document.querySelectorAll('.user-logged-in').forEach(el => el.classList.remove('d-none'));
    document.querySelectorAll('.user-logged-out').forEach(el => el.classList.add('d-none'));
    
    if (user.role === 'admin') {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
    }
  } else {
    document.querySelectorAll('.user-logged-in').forEach(el => el.classList.add('d-none'));
    document.querySelectorAll('.user-logged-out').forEach(el => el.classList.remove('d-none'));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('d-none'));
  }
}

// Add logout functionality to any logout button
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    const sessionId = localStorage.getItem('sessionId');
    
    try {
      await fetch('/auth/logout', {
        headers: {
          'Authorization': sessionId
        }
      });
    } finally {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  });
}
