const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'courses.json');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory storage
let courses = [];
let nextId = 1;

// Initialize data storage
async function initializeStorage() {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });

    // Try to load existing courses
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      courses = JSON.parse(data);
      if (courses.length > 0) {
        nextId = Math.max(...courses.map(c => c.id)) + 1;
      }
      console.log(`Loaded ${courses.length} courses from storage`);
    } catch (err) {
      // File doesn't exist yet, start with empty array
      console.log('No existing courses found, starting fresh');
      courses = [];
    }
  } catch (err) {
    console.error('Error initializing storage:', err);
  }
}

// Save courses to file
async function saveCourses() {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(courses, null, 2));
    console.log('Courses saved to file');
  } catch (err) {
    console.error('Error saving courses:', err);
  }
}

// Course structure template
const createCourseTemplate = (data) => ({
  id: nextId++,
  title: data.title || 'Untitled Course',
  description: data.description || '',
  instructor: data.instructor || '',
  duration: data.duration || '',
  level: data.level || 'Beginner',
  objectives: data.objectives || [],
  modules: data.modules || [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// API Routes

// Get all courses
app.get('/api/courses', (req, res) => {
  res.json(courses);
});

// Get single course
app.get('/api/courses/:id', (req, res) => {
  const course = courses.find(c => c.id === parseInt(req.params.id));
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }
  res.json(course);
});

// Create new course
app.post('/api/courses', async (req, res) => {
  try {
    const course = createCourseTemplate(req.body);
    courses.push(course);
    await saveCourses();
    res.status(201).json(course);
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Update course
app.put('/api/courses/:id', async (req, res) => {
  try {
    const index = courses.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Course not found' });
    }

    courses[index] = {
      ...courses[index],
      ...req.body,
      id: courses[index].id,
      createdAt: courses[index].createdAt,
      updatedAt: new Date().toISOString()
    };

    await saveCourses();
    res.json(courses[index]);
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete course
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const index = courses.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Course not found' });
    }

    courses.splice(index, 1);
    await saveCourses();
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// Add module to course
app.post('/api/courses/:id/modules', async (req, res) => {
  try {
    const course = courses.find(c => c.id === parseInt(req.params.id));
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const module = {
      id: Date.now(),
      title: req.body.title || 'Untitled Module',
      description: req.body.description || '',
      lessons: req.body.lessons || [],
      duration: req.body.duration || ''
    };

    course.modules.push(module);
    course.updatedAt = new Date().toISOString();
    await saveCourses();
    res.status(201).json(module);
  } catch (err) {
    console.error('Error adding module:', err);
    res.status(500).json({ error: 'Failed to add module' });
  }
});

// Export single course as JSON
app.get('/api/courses/:id/export', (req, res) => {
  const course = courses.find(c => c.id === parseInt(req.params.id));
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="course-${course.title.toLowerCase().replace(/\s+/g, '-')}-${course.id}.json"`);
  res.send(JSON.stringify(course, null, 2));
});

// Export all courses as JSON
app.get('/api/courses/export/all', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="all-courses-${Date.now()}.json"`);
  res.send(JSON.stringify(courses, null, 2));
});

// Import courses from JSON
app.post('/api/courses/import', async (req, res) => {
  try {
    const importedCourses = req.body;

    if (!Array.isArray(importedCourses)) {
      return res.status(400).json({ error: 'Invalid import data' });
    }

    // Assign new IDs to imported courses
    const newCourses = importedCourses.map(course => ({
      ...course,
      id: nextId++,
      createdAt: course.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    courses.push(...newCourses);
    await saveCourses();

    res.status(201).json({
      message: `Successfully imported ${newCourses.length} courses`,
      courses: newCourses
    });
  } catch (err) {
    console.error('Error importing courses:', err);
    res.status(500).json({ error: 'Failed to import courses' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    coursesCount: courses.length,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize and start server
initializeStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║   Course Designer AIR Hub Server                       ║
║   Running on http://localhost:${PORT}                     ║
║   Courses loaded: ${courses.length.toString().padEnd(32)}║
╚════════════════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to initialize server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, saving data and shutting down...');
  await saveCourses();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, saving data and shutting down...');
  await saveCourses();
  process.exit(0);
});