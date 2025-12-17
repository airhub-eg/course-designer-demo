// ==================== Global Variables ====================
let courses = [];
let editingCourseId = null;
let objectivesCount = 0;
let modulesCount = 0;
let filteredCourses = [];

// ==================== Local Storage Functions ====================
function saveCourses() {
    try {
        localStorage.setItem('courses', JSON.stringify(courses));
        console.log('Courses saved to localStorage:', courses.length);
    } catch (error) {
        console.error('Error saving courses:', error);
        showToast('Error saving courses', 'error');
    }
}

function loadCoursesFromStorage() {
    try {
        const storedCourses = localStorage.getItem('courses');
        if (storedCourses) {
            courses = JSON.parse(storedCourses);
            console.log('Courses loaded from localStorage:', courses.length);
        } else {
            courses = [];
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        courses = [];
        showToast('Error loading courses', 'error');
    }
}

// ==================== Initialize App ====================
function initializeApp() {
    loadCoursesFromStorage();
    renderCourses();
    updateStats();
}

// ==================== Render Functions ====================
function renderCourses() {
    const courseList = document.getElementById('courseList');
    const emptyState = document.getElementById('emptyState');

    filteredCourses = courses;

    if (filteredCourses.length === 0) {
        courseList.style.display = 'none';
        emptyState.style.display = 'flex';
        emptyState.style.flexDirection = 'column';
        emptyState.style.alignItems = 'center';
        return;
    }

    courseList.style.display = 'grid';
    emptyState.style.display = 'none';

    courseList.innerHTML = filteredCourses.map(course => `
        <div class="course-card" data-course-id="${course.id}">
            <div class="course-header">
                <h3 class="course-title">${escapeHtml(course.title)}</h3>
                <span class="course-level">${escapeHtml(course.level)}</span>
            </div>
            
            <div class="course-meta">
                ${course.instructor ? `
                    <div class="course-meta-item">
                        <strong>Instructor:</strong> ${escapeHtml(course.instructor)}
                    </div>
                ` : ''}
                ${course.duration ? `
                    <div class="course-meta-item">
                        <strong>Duration:</strong> ${escapeHtml(course.duration)}
                    </div>
                ` : ''}
                ${course.modules && course.modules.length > 0 ? `
                    <div class="course-meta-item">
                        <strong>Modules:</strong> ${course.modules.length}
                    </div>
                ` : ''}
                ${course.objectives && course.objectives.length > 0 ? `
                    <div class="course-meta-item">
                        <strong>Objectives:</strong> ${course.objectives.length}
                    </div>
                ` : ''}
            </div>
            
            <p class="course-description">${escapeHtml(course.description || 'No description provided')}</p>
            
            <div class="course-actions">
                <button class="btn btn-primary btn-small" onclick="editCourse(${course.id})">Edit</button>
                <button class="btn btn-secondary btn-small" onclick="viewCourse(${course.id})">View</button>
                <button class="btn btn-accent btn-small" onclick="exportCourse(${course.id})">Export</button>
                <button class="btn btn-danger btn-small" onclick="deleteCourse(${course.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const totalCourses = courses.length;
    const totalModules = courses.reduce((sum, course) => sum + (course.modules?.length || 0), 0);

    // Calculate total duration (simplified - just count hours mentioned)
    let totalHours = 0;
    courses.forEach(course => {
        if (course.duration) {
            const hours = course.duration.match(/(\d+)\s*(?:hour|hr|h)/i);
            if (hours) {
                totalHours += parseInt(hours[1]);
            }
        }
    });

    document.getElementById('totalCourses').textContent = totalCourses;
    document.getElementById('totalModules').textContent = totalModules;
    document.getElementById('totalDuration').textContent = totalHours > 0 ? `${totalHours}h` : '0h';
}

// ==================== Modal Functions ====================
function openModal(courseId = null) {
    const modal = document.getElementById('courseModal');
    const form = document.getElementById('courseForm');
    const modalTitle = document.getElementById('modalTitle');

    form.reset();
    document.getElementById('objectivesList').innerHTML = '';
    document.getElementById('modulesList').innerHTML = '';
    objectivesCount = 0;
    modulesCount = 0;

    if (courseId) {
        const course = courses.find(c => c.id === courseId);
        if (course) {
            editingCourseId = courseId;
            modalTitle.textContent = 'Edit Course';
            document.getElementById('courseId').value = course.id;
            document.getElementById('courseTitle').value = course.title;
            document.getElementById('instructor').value = course.instructor || '';
            document.getElementById('level').value = course.level;
            document.getElementById('duration').value = course.duration || '';
            document.getElementById('description').value = course.description || '';

            if (course.objectives && course.objectives.length > 0) {
                course.objectives.forEach(obj => addObjective(obj));
            } else {
                addObjective();
            }

            if (course.modules && course.modules.length > 0) {
                course.modules.forEach(mod => addModule(mod.title, mod.description));
            }
        }
    } else {
        editingCourseId = null;
        modalTitle.textContent = 'Create New Course';
        addObjective();
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('courseModal').classList.remove('active');
    editingCourseId = null;
}

function openViewModal() {
    document.getElementById('viewModal').classList.add('active');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
}

// ==================== Objectives Functions ====================
function addObjective(value = '') {
    const list = document.getElementById('objectivesList');
    const id = ++objectivesCount;
    const div = document.createElement('div');
    div.className = 'objective-item';
    div.innerHTML = `
        <input type="text" placeholder="e.g., Understand core concepts of..." value="${escapeHtml(value)}" data-objective-id="${id}">
        <button type="button" class="remove-btn" onclick="removeObjective(${id})">Remove</button>
    `;
    list.appendChild(div);
}

function removeObjective(id) {
    const item = document.querySelector(`[data-objective-id="${id}"]`).parentElement;
    item.remove();
}

// ==================== Modules Functions ====================
function addModule(title = '', description = '') {
    const list = document.getElementById('modulesList');
    const id = ++modulesCount;
    const div = document.createElement('div');
    div.className = 'module-item';
    div.innerHTML = `
        <div class="form-group">
            <label>Module Title</label>
            <input type="text" placeholder="e.g., Introduction to..." value="${escapeHtml(title)}" data-module-title-id="${id}">
        </div>
        <div class="form-group">
            <label>Module Description</label>
            <textarea placeholder="Describe what students will learn in this module..." data-module-desc-id="${id}">${escapeHtml(description)}</textarea>
        </div>
        <button type="button" class="remove-btn" onclick="removeModule(${id})">Remove Module</button>
    `;
    list.appendChild(div);
}

function removeModule(id) {
    const item = document.querySelector(`[data-module-title-id="${id}"]`).closest('.module-item');
    item.remove();
}

// ==================== Form Submission ====================
document.getElementById('courseForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const objectives = Array.from(document.querySelectorAll('[data-objective-id]'))
        .map(input => input.value.trim())
        .filter(val => val);

    const modules = Array.from(document.querySelectorAll('[data-module-title-id]'))
        .map(input => {
            const id = input.getAttribute('data-module-title-id');
            const desc = document.querySelector(`[data-module-desc-id="${id}"]`);
            return {
                title: input.value.trim(),
                description: desc ? desc.value.trim() : ''
            };
        })
        .filter(mod => mod.title);

    const courseData = {
        title: document.getElementById('courseTitle').value.trim(),
        instructor: document.getElementById('instructor').value.trim(),
        level: document.getElementById('level').value,
        duration: document.getElementById('duration').value.trim(),
        description: document.getElementById('description').value.trim(),
        objectives,
        modules,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editingCourseId) {
        // Update existing course
        const index = courses.findIndex(c => c.id === editingCourseId);
        if (index !== -1) {
            courseData.id = editingCourseId;
            courseData.createdAt = courses[index].createdAt;
            courses[index] = courseData;
            showToast('Course updated successfully!', 'success');
        }
    } else {
        // Create new course
        courseData.id = Date.now();
        courses.push(courseData);
        showToast('Course created successfully!', 'success');
    }

    saveCourses();
    closeModal();
    renderCourses();
    updateStats();
});

// ==================== Course Actions ====================
function editCourse(id) {
    openModal(id);
}

function viewCourse(id) {
    const course = courses.find(c => c.id === id);
    if (!course) return;

    const modalTitle = document.getElementById('viewModalTitle');
    const modalContent = document.getElementById('viewModalContent');

    modalTitle.textContent = course.title;

    modalContent.innerHTML = `
        <div class="course-detail-section">
            <h3>Course Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Level</div>
                    <div class="detail-value">${escapeHtml(course.level)}</div>
                </div>
                ${course.instructor ? `
                    <div class="detail-item">
                        <div class="detail-label">Instructor</div>
                        <div class="detail-value">${escapeHtml(course.instructor)}</div>
                    </div>
                ` : ''}
                ${course.duration ? `
                    <div class="detail-item">
                        <div class="detail-label">Duration</div>
                        <div class="detail-value">${escapeHtml(course.duration)}</div>
                    </div>
                ` : ''}
                <div class="detail-item">
                    <div class="detail-label">Modules</div>
                    <div class="detail-value">${course.modules?.length || 0}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Objectives</div>
                    <div class="detail-value">${course.objectives?.length || 0}</div>
                </div>
            </div>
        </div>

        <div class="course-detail-section">
            <h3>Description</h3>
            <p>${escapeHtml(course.description || 'No description provided')}</p>
        </div>

        ${course.objectives && course.objectives.length > 0 ? `
            <div class="course-detail-section">
                <h3>Learning Objectives</h3>
                <ul class="objectives-list">
                    ${course.objectives.map(obj => `<li>✓ ${escapeHtml(obj)}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        ${course.modules && course.modules.length > 0 ? `
            <div class="course-detail-section">
                <h3>Course Modules</h3>
                <div class="modules-list">
                    ${course.modules.map((mod, index) => `
                        <div class="module-card">
                            <h4>Module ${index + 1}: ${escapeHtml(mod.title)}</h4>
                            <p>${escapeHtml(mod.description || 'No description')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <div class="course-detail-section">
            <h3>Metadata</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Created</div>
                    <div class="detail-value">${formatDate(course.createdAt)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Last Updated</div>
                    <div class="detail-value">${formatDate(course.updatedAt)}</div>
                </div>
            </div>
        </div>
    `;

    openViewModal();
}

function deleteCourse(id) {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
        const index = courses.findIndex(c => c.id === id);
        if (index !== -1) {
            courses.splice(index, 1);
            saveCourses();
            renderCourses();
            updateStats();
            showToast('Course deleted successfully', 'success');
        }
    }
}

function exportCourse(id) {
    const course = courses.find(c => c.id === id);
    if (!course) return;

    const dataStr = JSON.stringify(course, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `course-${course.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showToast('Course exported successfully!', 'success');
}

function exportAllCourses() {
    if (courses.length === 0) {
        showToast('No courses to export', 'error');
        return;
    }

    const dataStr = JSON.stringify(courses, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `all-courses-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showToast(`Exported ${courses.length} course${courses.length !== 1 ? 's' : ''}!`, 'success');
}

// ==================== Filter & Search Functions ====================
function filterCourses() {
    const level = document.getElementById('levelFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    filteredCourses = courses.filter(course => {
        const matchesLevel = !level || course.level === level;
        const matchesSearch = !searchTerm ||
            course.title.toLowerCase().includes(searchTerm) ||
            (course.description && course.description.toLowerCase().includes(searchTerm)) ||
            (course.instructor && course.instructor.toLowerCase().includes(searchTerm));

        return matchesLevel && matchesSearch;
    });

    renderFilteredCourses();
}

function searchCourses() {
    filterCourses();
}

function renderFilteredCourses() {
    const courseList = document.getElementById('courseList');
    const emptyState = document.getElementById('emptyState');

    if (filteredCourses.length === 0) {
        courseList.style.display = 'none';
        emptyState.style.display = 'flex';
        emptyState.style.flexDirection = 'column';
        emptyState.style.alignItems = 'center';
        emptyState.innerHTML = `
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="60" r="50" fill="#f0f4f8"/>
                <path d="M40 50H80M40 60H80M40 70H65" stroke="#74acd4" stroke-width="3" stroke-linecap="round"/>
            </svg>
            <h3>No courses found</h3>
            <p>Try adjusting your filters or search terms</p>
            ${courses.length === 0 ? '<button class="btn btn-primary" onclick="openModal()">Create Course</button>' : ''}
        `;
        return;
    }

    courseList.style.display = 'grid';
    emptyState.style.display = 'none';

    courseList.innerHTML = filteredCourses.map(course => `
        <div class="course-card" data-course-id="${course.id}">
            <div class="course-header">
                <h3 class="course-title">${escapeHtml(course.title)}</h3>
                <span class="course-level">${escapeHtml(course.level)}</span>
            </div>
            
            <div class="course-meta">
                ${course.instructor ? `
                    <div class="course-meta-item">
                        <strong>Instructor:</strong> ${escapeHtml(course.instructor)}
                    </div>
                ` : ''}
                ${course.duration ? `
                    <div class="course-meta-item">
                        <strong>Duration:</strong> ${escapeHtml(course.duration)}
                    </div>
                ` : ''}
                ${course.modules && course.modules.length > 0 ? `
                    <div class="course-meta-item">
                        <strong>Modules:</strong> ${course.modules.length}
                    </div>
                ` : ''}
                ${course.objectives && course.objectives.length > 0 ? `
                    <div class="course-meta-item">
                        <strong>Objectives:</strong> ${course.objectives.length}
                    </div>
                ` : ''}
            </div>
            
            <p class="course-description">${escapeHtml(course.description || 'No description provided')}</p>
            
            <div class="course-actions">
                <button class="btn btn-primary btn-small" onclick="editCourse(${course.id})">Edit</button>
                <button class="btn btn-secondary btn-small" onclick="viewCourse(${course.id})">View</button>
                <button class="btn btn-accent btn-small" onclick="exportCourse(${course.id})">Export</button>
                <button class="btn btn-danger btn-small" onclick="deleteCourse(${course.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// ==================== Toast Notification ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ==================== Utility Functions ====================
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== Event Listeners ====================
// Close modals on outside click
document.getElementById('courseModal').addEventListener('click', (e) => {
    if (e.target.id === 'courseModal') {
        closeModal();
    }
});

document.getElementById('viewModal').addEventListener('click', (e) => {
    if (e.target.id === 'viewModal') {
        closeViewModal();
    }
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeViewModal();
    }
});

// ==================== Initialize App on Load ====================
document.addEventListener('DOMContentLoaded', initializeApp);