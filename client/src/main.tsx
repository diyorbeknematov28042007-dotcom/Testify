import React from 'react';
import ReactDOM from 'react-dom/client';
import { Switch, Route, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy, useEffect } from 'react';
import './index.css';
import { ToastContainer } from './components/ui/Toast';
import { useToast, setToastFn } from './hooks/useToast';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const StudentHome = lazy(() => import('./pages/student/StudentHome'));
const StudentTest = lazy(() => import('./pages/student/StudentTest'));
const LazyStudentResult = lazy(() => import('./pages/student/StudentResult').then(m => ({ default: m.StudentResult })));
const LazyStudentReview = lazy(() => import('./pages/student/StudentResult').then(m => ({ default: m.StudentReview })));
const TeacherLogin = lazy(() => import('./pages/teacher/TeacherLogin'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherCreate = lazy(() => import('./pages/teacher/TeacherCreate'));
const TeacherResults = lazy(() => import('./pages/teacher/TeacherResults'));
const PaymentPage = lazy(() => import('./pages/teacher/PaymentPage'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30000 } },
});

function TeacherGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('teacherToken');
  if (!token) return <Redirect to="/teacher/login" />;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('adminToken');
  if (!token) return <Redirect to="/admin/login" />;
  return <>{children}</>;
}

function App() {
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    setToastFn(addToast);
  }, [addToast]);

  const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <QueryClientProvider client={qc}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Suspense fallback={<Spinner />}>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/student" component={StudentHome} />
          <Route path="/student/test/:code" component={StudentTest} />
          <Route path="/student/test/:code/result" component={LazyStudentResult} />
          <Route path="/student/test/:code/review" component={LazyStudentReview} />
          <Route path="/teacher/login" component={TeacherLogin} />
          <Route path="/teacher/dashboard">
            {() => <TeacherGuard><TeacherDashboard /></TeacherGuard>}
          </Route>
          <Route path="/teacher/create">
            {() => <TeacherGuard><TeacherCreate /></TeacherGuard>}
          </Route>
          <Route path="/teacher/edit/:id">
            {() => <TeacherGuard><TeacherCreate /></TeacherGuard>}
          </Route>
          <Route path="/teacher/test/:id/results">
            {() => <TeacherGuard><TeacherResults /></TeacherGuard>}
          </Route>
          <Route path="/teacher/payment">
            {() => <TeacherGuard><PaymentPage /></TeacherGuard>}
          </Route>
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/dashboard">
            {() => <AdminGuard><AdminDashboard /></AdminGuard>}
          </Route>
          <Route>
            {() => (
              <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
                <p className="text-slate-500 mb-6">Sahifa topilmadi</p>
                <a href="/" className="btn-primary">Bosh sahifaga qaytish</a>
              </div>
            )}
          </Route>
        </Switch>
      </Suspense>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
