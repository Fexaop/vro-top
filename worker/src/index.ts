import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { handleVtopLogin, handleVtopAttendance, handleVtopGrades, handleVtopExam, handleVtopCalendar, handleVtopProfile, handleVtopLeave } from './handlers/vtop';
import { handleLmsLogin, handleLmsAssignments } from './handlers/lms';
import { handleVitolLogin, handleVitolAssignments } from './handlers/vitol';

const app = new Hono();

app.use('*', corsMiddleware);

app.post('/vtop/login', handleVtopLogin);
app.post('/vtop/attendance', handleVtopAttendance);
app.post('/vtop/grades', handleVtopGrades);
app.post('/vtop/exam', handleVtopExam);
app.post('/vtop/calendar', handleVtopCalendar);
app.post('/vtop/profile', handleVtopProfile);
app.post('/vtop/leave', handleVtopLeave);

app.post('/lms/login', handleLmsLogin);
app.post('/lms/assignments', handleLmsAssignments);

app.post('/vitol/login', handleVitolLogin);
app.post('/vitol/assignments', handleVitolAssignments);

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
