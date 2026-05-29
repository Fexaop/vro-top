import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import {
  handleVtopPrelogin,
  handleVtopLogin,
  handleVtopAttendance,
  handleVtopGrades,
  handleVtopGradesAll,
  handleVtopExam,
  handleVtopCalendar,
  handleVtopProfile,
  handleVtopLeave,
} from './handlers/vtop';
import { handleLmsLogin, handleLmsAssignments } from './handlers/lms';
import { handleVitolLogin, handleVitolAssignments } from './handlers/vitol';

const app = new Hono();

app.use('*', corsMiddleware);

app.post('/vtop/prelogin', handleVtopPrelogin);
app.post('/vtop/login', handleVtopLogin);
app.post('/vtop/attendance', handleVtopAttendance);
app.post('/vtop/grades/current', handleVtopGrades);
app.post('/vtop/grades/all', handleVtopGradesAll);
app.post('/vtop/exam-schedule', handleVtopExam);
app.post('/vtop/calendar', handleVtopCalendar);
app.post('/vtop/hostel', handleVtopProfile);
app.post('/vtop/hostel/leave', handleVtopLeave);

app.post('/lms/login', handleLmsLogin);
app.post('/lms/assignments', handleLmsAssignments);

app.post('/vitol/login', handleVitolLogin);
app.post('/vitol/assignments', handleVitolAssignments);

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
